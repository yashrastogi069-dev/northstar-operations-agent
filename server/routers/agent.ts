import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import {
  addAgentStateSnapshot,
  addAuditEvent,
  createAgentApproval,
  createAgentArtifact,
  createAgentEvaluationResult,
  createAgentMemory,
  createAgentRun,
  createAgentRunFeedback,
  createAgentToolCall,
  getAgentRecoveryForUser,
  getAgentRunForUser,
  listAgentApprovals,
  listAgentArtifacts,
  listAgentEvaluationResults,
  listAgentIntegrations,
  listAgentMemories,
  listAgentRunFeedback,
  listAgentRuns,
  listAgentStateSnapshots,
  listAgentToolCalls,
  reviewAgentApproval,
  updateAgentRun,
} from "../db";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import { evaluateAgentScenario } from "../lib/agentEvaluation";
import { runNorthstarGraph } from "../lib/agentGraph";
import { classifyRequest, WORKFLOW_TEMPLATES } from "../lib/agentPolicy";

const runInput = z.object({
  request: z.string().trim().min(3).max(4_000),
  dataText: z.string().max(200_000).optional(),
  allowPublicResearch: z.boolean().default(false),
  title: z.string().trim().min(3).max(220).optional(),
});

type AgentCallerContext = { user: { id: number; role: "admin" | "user" } };

function sanitiseSummary(value: string, max = 1_000) {
  return value.replace(/(?:api[_ -]?key|token|password|secret)\s*[:=]\s*[^\s,;]+/gi, "$1=[redacted]").slice(0, max);
}

async function executeAgentRun(ctx: AgentCallerContext, input: z.infer<typeof runInput>, recoveryOfRunId?: number) {
  const decision = classifyRequest(input.request, Boolean(input.dataText?.trim()));
  const threadId = `northstar_${nanoid(20)}`;
  const runId = await createAgentRun({ threadId, title: input.title ?? input.request.slice(0, 96), request: input.request, taskType: decision.taskType, riskTier: decision.riskTier, ownerUserId: ctx.user.id, recoveryOfRunId });
  await addAuditEvent({ actorUserId: ctx.user.id, eventType: recoveryOfRunId ? "agent.run_recovery_started" : "agent.run_started", entityType: "agent_run", entityId: runId, severity: decision.riskTier === "blocked" ? "warning" : "info", details: { threadId, taskType: decision.taskType, riskTier: decision.riskTier, dataProvided: Boolean(input.dataText?.trim()), recoveryOfRunId } });
  try {
    const memories = await listAgentMemories(ctx.user.id, ctx.user.role);
    const memoryHints = memories.slice(0, 8).map(memory => `${memory.key}: ${memory.content}`).filter(value => value.length <= 1_200);
    const state = await runNorthstarGraph({ request: input.request, dataText: input.dataText, allowPublicResearch: input.allowPublicResearch, memoryHints, role: ctx.user.role, userId: ctx.user.id, runId });
    await updateAgentRun({ runId, status: state.status, plan: state.plan, result: state.result, retryCount: state.retryCount, complete: state.status !== "awaiting_approval" });
    for (let sequence = 0; sequence < state.trace.length; sequence += 1) {
      const event = state.trace[sequence];
      await addAgentStateSnapshot({ runId, node: event.node, sequence: sequence + 1, statePayload: { detail: event.detail, at: event.at, taskType: state.taskType, riskTier: state.riskTier, status: state.status } });
    }
    const toolCallIds: number[] = [];
    for (const tool of state.toolResults) {
      toolCallIds.push(await createAgentToolCall({ runId, toolName: tool.toolName, tier: tool.toolName === "create_internal_draft" ? 2 : 1, inputSummary: sanitiseSummary(input.request), outputSummary: sanitiseSummary(tool.summary), durationMs: tool.durationMs, status: tool.status, errorCode: tool.status === "failed" ? "TOOL_UNAVAILABLE" : undefined, idempotencyKey: `${threadId}:${tool.toolName}` }));
    }
    let artifactId: number | undefined;
    if (state.plan?.tools.includes("create_internal_draft")) artifactId = await createAgentArtifact({ runId, artifactType: "draft", title: `Draft — ${input.title ?? input.request.slice(0, 88)}`, content: state.result });
    let approvalId: number | undefined;
    if (state.status === "awaiting_approval") {
      approvalId = await createAgentApproval({ runId, toolCallId: toolCallIds.at(-1), actionSummary: state.approvalSummary ?? "Review the proposed future action. No external effect will occur in Northstar.", proposedPayload: { request: input.request, result: state.result, plan: state.plan }, requestedByUserId: ctx.user.id });
    }
    await addAuditEvent({ actorUserId: ctx.user.id, eventType: `agent.run_${state.status}`, entityType: "agent_run", entityId: runId, severity: state.status === "blocked" || state.status === "failed" ? "warning" : "info", details: { threadId, toolNames: state.toolResults.map(tool => tool.toolName), artifactId, approvalId, retryCount: state.retryCount, recoveryOfRunId } });
    return { runId, threadId, status: state.status, riskTier: state.riskTier, policyReason: state.policyReason, plan: state.plan, requiresPublicResearchConsent: Boolean(state.plan?.requiresPublicResearchConsent), result: state.result, tools: state.toolResults, approvalId, artifactId };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unexpected agent execution failure.";
    await updateAgentRun({ runId, status: "failed", errorMessage, complete: true });
    await addAgentStateSnapshot({ runId, node: "failed", sequence: 1, statePayload: { errorMessage } });
    await addAuditEvent({ actorUserId: ctx.user.id, eventType: "agent.run_failed", entityType: "agent_run", entityId: runId, severity: "high", details: { errorMessage, recoveryOfRunId } });
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Northstar could not complete this run. The failed run is available for review and eligible read-only recovery." });
  }
}

export const agentRouter = router({
  capabilities: protectedProcedure.query(() => ({
    agent: "Northstar Operations Agent",
    model: "LangGraph StateGraph with LangChain-compatible tools",
    tools: [
      { id: "knowledge_search", mode: "read-only", description: "Approved firm knowledge with role-aware retrieval." },
      { id: "public_research", mode: "read-only", description: "Credential-free public reference research with cited results." },
      { id: "structured_analysis", mode: "read-only", description: "Local CSV and delimited-text analysis." },
      { id: "create_internal_draft", mode: "draft-only", description: "Reviewable internal artifacts; no send or record-update action." },
    ],
    guarantees: ["policy gate before planning", "tool allowlist", "approval before future external effects", "durable trace snapshots", "bounded retry", "no write integration enabled"],
  })),
  workflows: router({
    templates: protectedProcedure.query(() => WORKFLOW_TEMPLATES),
  }),
  runs: router({
    list: protectedProcedure.input(z.object({ limit: z.number().int().min(1).max(100).default(60) })).query(({ ctx, input }) => listAgentRuns(ctx.user.id, ctx.user.role, input.limit)),
    get: protectedProcedure.input(z.object({ runId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      const run = await getAgentRunForUser(input.runId, ctx.user.id, ctx.user.role);
      if (!run) throw new TRPCError({ code: "NOT_FOUND", message: "Agent run not found." });
      return { run, snapshots: await listAgentStateSnapshots(run.id), toolCalls: await listAgentToolCalls(run.id), artifacts: await listAgentArtifacts(run.id), feedback: await listAgentRunFeedback(run.id) };
    }),
    start: protectedProcedure.input(runInput).mutation(({ ctx, input }) => executeAgentRun(ctx, input)),
    retry: protectedProcedure.input(z.object({ runId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const failedRun = await getAgentRunForUser(input.runId, ctx.user.id, ctx.user.role);
      if (!failedRun) throw new TRPCError({ code: "NOT_FOUND", message: "Agent run not found." });
      if (failedRun.status !== "failed") throw new TRPCError({ code: "BAD_REQUEST", message: "Only a failed run can be recovered." });
      if (failedRun.taskType === "analysis") throw new TRPCError({ code: "BAD_REQUEST", message: "For privacy, tabular inputs are not retained for automatic replay. Submit the task with the data again." });
      if (await getAgentRecoveryForUser(failedRun.id, ctx.user.id, ctx.user.role)) throw new TRPCError({ code: "CONFLICT", message: "A recovery attempt already exists for this failed run." });
      return executeAgentRun(ctx, { request: failedRun.request, title: `Recovery — ${failedRun.title}`, allowPublicResearch: false }, failedRun.id);
    }),
  }),
  approvals: router({
    list: protectedProcedure.query(({ ctx }) => listAgentApprovals(ctx.user.id, ctx.user.role)),
    review: adminProcedure.input(z.object({ approvalId: z.number().int().positive(), status: z.enum(["approved", "rejected"]), reviewerNote: z.string().trim().max(1_200).optional() })).mutation(async ({ ctx, input }) => {
      const approval = await reviewAgentApproval({ ...input, reviewerUserId: ctx.user.id });
      await addAuditEvent({ actorUserId: ctx.user.id, eventType: `agent.approval_${input.status}`, entityType: "agent_approval", entityId: input.approvalId, details: { runId: approval.runId, externalActionPerformed: false } });
      return { success: true, externalActionPerformed: false };
    }),
  }),
  feedback: router({
    create: protectedProcedure.input(z.object({ runId: z.number().int().positive(), rating: z.enum(["helpful", "not_helpful", "safety_concern"]), comment: z.string().trim().max(1_200).optional() })).mutation(async ({ ctx, input }) => {
      const run = await getAgentRunForUser(input.runId, ctx.user.id, ctx.user.role);
      if (!run) throw new TRPCError({ code: "NOT_FOUND", message: "Agent run not found." });
      const feedbackId = await createAgentRunFeedback({ ...input, reporterUserId: ctx.user.id });
      await addAuditEvent({ actorUserId: ctx.user.id, eventType: "agent.run_feedback", entityType: "agent_feedback", entityId: feedbackId, severity: input.rating === "safety_concern" ? "high" : "info", details: { runId: input.runId, rating: input.rating } });
      return { feedbackId };
    }),
  }),
  memory: router({
    list: protectedProcedure.query(({ ctx }) => listAgentMemories(ctx.user.id, ctx.user.role)),
    create: protectedProcedure.input(z.object({ key: z.string().trim().min(3).max(180), content: z.string().trim().min(3).max(5_000), scope: z.enum(["user", "firm"]).default("user"), sensitivity: z.enum(["internal", "confidential"]).default("internal") })).mutation(async ({ ctx, input }) => {
      if (input.scope === "firm" && ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Only an administrator can create firm-scoped memory." });
      const memoryId = await createAgentMemory({ ...input, ownerUserId: input.scope === "user" ? ctx.user.id : undefined, createdByUserId: ctx.user.id });
      await addAuditEvent({ actorUserId: ctx.user.id, eventType: "agent.memory_created", entityType: "agent_memory", entityId: memoryId, details: { scope: input.scope, sensitivity: input.sensitivity } });
      return { memoryId };
    }),
  }),
  integrations: protectedProcedure.query(async () => ({ configured: await listAgentIntegrations(), supported: ["SharePoint (read-only)", "Google Drive (read-only)", "Salesforce/HubSpot (read-only or draft-only)", "Slack/Teams (draft-only)", "Qdrant-compatible vector store"] })),
  evaluations: router({
    list: adminProcedure.input(z.object({ limit: z.number().int().min(1).max(200).default(100) })).query(({ input }) => listAgentEvaluationResults(input.limit)),
    run: adminProcedure.input(z.object({ scenarioName: z.string().trim().min(3).max(180), request: z.string().trim().min(3).max(4_000), expectedPolicy: z.enum(["allow", "review", "block"]), expectedTools: z.array(z.enum(["knowledge_search", "public_research", "structured_analysis", "create_internal_draft"])).max(4).optional(), hasData: z.boolean().default(false) })).mutation(async ({ ctx, input }) => {
      const outcome = evaluateAgentScenario(input);
      await createAgentEvaluationResult({ ...input, ...outcome, runByUserId: ctx.user.id });
      await addAuditEvent({ actorUserId: ctx.user.id, eventType: "agent.evaluation_run", entityType: "agent_evaluation", severity: outcome.policyPass && outcome.toolPass ? "info" : "warning", details: { scenarioName: input.scenarioName, policyPass: outcome.policyPass, toolPass: outcome.toolPass } });
      return outcome;
    }),
  }),
});
