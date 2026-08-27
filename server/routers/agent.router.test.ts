import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../_core/context";

const mocks = vi.hoisted(() => ({
  addAgentStateSnapshot: vi.fn(), addAuditEvent: vi.fn(), createAgentApproval: vi.fn(), createAgentArtifact: vi.fn(), createAgentMemory: vi.fn(), createAgentEvaluationResult: vi.fn(), createAgentRun: vi.fn(), createAgentRunFeedback: vi.fn(), createAgentToolCall: vi.fn(), getAgentRecoveryForUser: vi.fn(), getAgentRunForUser: vi.fn(), listAgentApprovals: vi.fn(), listAgentArtifacts: vi.fn(), listAgentEvaluationResults: vi.fn(), listAgentIntegrations: vi.fn(), listAgentMemories: vi.fn(), listAgentRunFeedback: vi.fn(), listAgentRuns: vi.fn(), listAgentStateSnapshots: vi.fn(), listAgentToolCalls: vi.fn(), reviewAgentApproval: vi.fn(), updateAgentRun: vi.fn(),
}));

vi.mock("../db", () => mocks);
const graphMock = vi.hoisted(() => ({ runNorthstarGraph: vi.fn() }));
vi.mock("../lib/agentGraph", () => graphMock);

import { agentRouter } from "./agent";

function contextFor(role: "admin" | "user", id = 31): TrpcContext {
  return { user: { id, openId: `agent-${id}`, name: "Agent test user", email: "agent@example.com", loginMethod: "manus", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: () => undefined } as TrpcContext["res"] };
}

describe("northstar agent router safeguards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.addAuditEvent.mockResolvedValue(undefined);
    mocks.createAgentRunFeedback.mockResolvedValue(18);
    mocks.listAgentMemories.mockResolvedValue([]);
    mocks.createAgentRun.mockResolvedValue(44);
  });

  it("prevents an ordinary user from creating shared firm memory", async () => {
    await expect(agentRouter.createCaller(contextFor("user")).memory.create({ key: "client preference", content: "Keep this private.", scope: "firm" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.createAgentMemory).not.toHaveBeenCalled();
  });

  it("accepts feedback only for a run visible to the requester and records an auditable safety report", async () => {
    mocks.getAgentRunForUser.mockResolvedValue({ id: 9, ownerUserId: 31 });
    const result = await agentRouter.createCaller(contextFor("user")).feedback.create({ runId: 9, rating: "safety_concern", comment: "Review this output." });
    expect(result).toEqual({ feedbackId: 18 });
    expect(mocks.createAgentRunFeedback).toHaveBeenCalledWith({ runId: 9, rating: "safety_concern", comment: "Review this output.", reporterUserId: 31 });
    expect(mocks.addAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: "agent.run_feedback", severity: "high", details: { runId: 9, rating: "safety_concern" } }));
  });

  it("does not accept feedback for a run outside the requester’s authorization scope", async () => {
    mocks.getAgentRunForUser.mockResolvedValue(undefined);
    await expect(agentRouter.createCaller(contextFor("user")).feedback.create({ runId: 9, rating: "helpful" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(mocks.createAgentRunFeedback).not.toHaveBeenCalled();
  });

  it("refuses automatic recovery of data-analysis runs and duplicate recovery attempts", async () => {
    mocks.getAgentRunForUser.mockResolvedValue({ id: 9, title: "Analysis", request: "Analyse", status: "failed", taskType: "analysis" });
    await expect(agentRouter.createCaller(contextFor("user")).runs.retry({ runId: 9 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    mocks.getAgentRunForUser.mockResolvedValue({ id: 9, title: "Research", request: "Research", status: "failed", taskType: "research" });
    mocks.getAgentRecoveryForUser.mockResolvedValue({ id: 10, recoveryOfRunId: 9 });
    await expect(agentRouter.createCaller(contextFor("user")).runs.retry({ runId: 9 })).rejects.toMatchObject({ code: "CONFLICT" });
    expect(mocks.createAgentRun).not.toHaveBeenCalled();
  });

  it("creates one new auditable successor for an eligible failed read-only request", async () => {
    mocks.getAgentRunForUser.mockResolvedValue({ id: 9, title: "Research", request: "Research current guidance", status: "failed", taskType: "research" });
    mocks.getAgentRecoveryForUser.mockResolvedValue(undefined);
    graphMock.runNorthstarGraph.mockResolvedValue({ taskType: "research", riskTier: "low", plan: { tools: [], needsApproval: false }, result: "Recovered safely.", retryCount: 0, trace: [], toolResults: [], status: "completed", approvalSummary: null, policyReason: "Read-only request." });
    const result = await agentRouter.createCaller(contextFor("user")).runs.retry({ runId: 9 });
    expect(result).toMatchObject({ runId: 44, status: "completed", result: "Recovered safely." });
    expect(mocks.createAgentRun).toHaveBeenCalledWith(expect.objectContaining({ recoveryOfRunId: 9, title: "Recovery — Research", request: "Research current guidance" }));
    expect(mocks.addAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: "agent.run_recovery_started", details: expect.objectContaining({ recoveryOfRunId: 9 }) }));
  });
});
