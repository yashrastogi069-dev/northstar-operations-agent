import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  agentApprovals,
  agentArtifacts,
  agentEvaluationResults,
  agentIntegrations,
  agentMemories,
  agentRuns,
  agentStateSnapshots,
  agentToolCalls,
  auditEvents,
  chatMessages,
  conversations,
  evaluationCases,
  evaluationRuns,
  feedback,
  knowledgeChunks,
  knowledgeDocuments,
  knowledgeSources,
  type InsertUser,
  users,
  workflowDrafts,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { buildAuditEvent, type AuditEventInput } from "./lib/audit";
import type { RetrievalCandidate } from "./lib/knowledge";
import { buildDraftValues, buildWorkflowReview, type DraftReviewStatus } from "./lib/workflow";
import type { AgentPlan, AgentRiskTier, AgentTaskType, AgentToolName } from "./lib/agentPolicy";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  values.lastSignedIn = user.lastSignedIn ?? new Date();
  updateSet.lastSignedIn = values.lastSignedIn;
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function addAuditEvent(input: AuditEventInput) {
  const db = await getDb();
  if (!db) return;
  await db.insert(auditEvents).values(buildAuditEvent(input));
}

export async function listKnowledgeSources(role: "admin" | "user") {
  const db = await getDb();
  if (!db) return [];
  const where = role === "admin" ? undefined : and(eq(knowledgeSources.approvalStatus, "approved"), eq(knowledgeSources.accessLevel, "all_users"));
  return db.select().from(knowledgeSources).where(where).orderBy(desc(knowledgeSources.updatedAt));
}

export async function createKnowledgeSource(input: {
  name: string;
  description?: string;
  classification: "internal" | "confidential" | "restricted";
  accessLevel: "all_users" | "admins_only";
  ownerUserId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  const result = await db.insert(knowledgeSources).values({
    name: input.name,
    description: input.description ?? null,
    classification: input.classification,
    accessLevel: input.accessLevel,
    ownerUserId: input.ownerUserId,
    approvalStatus: "draft",
  });
  return Number(result[0].insertId);
}

export async function getKnowledgeSource(sourceId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const results = await db.select().from(knowledgeSources).where(eq(knowledgeSources.id, sourceId)).limit(1);
  return results[0];
}

export async function setKnowledgeSourceApproval(sourceId: number, status: "approved" | "archived" | "draft") {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  await db.update(knowledgeSources).set({ approvalStatus: status }).where(eq(knowledgeSources.id, sourceId));
}

export async function listKnowledgeDocuments(role: "admin" | "user") {
  const db = await getDb();
  if (!db) return [];
  const where = role === "admin" ? undefined : and(eq(knowledgeSources.approvalStatus, "approved"), eq(knowledgeSources.accessLevel, "all_users"));
  return db
    .select({ document: knowledgeDocuments, sourceName: knowledgeSources.name, sourceApproval: knowledgeSources.approvalStatus })
    .from(knowledgeDocuments)
    .innerJoin(knowledgeSources, eq(knowledgeDocuments.sourceId, knowledgeSources.id))
    .where(where)
    .orderBy(desc(knowledgeDocuments.uploadedAt));
}

export async function createKnowledgeDocument(input: {
  sourceId: number;
  title: string;
  originalFilename: string;
  storageKey: string;
  storageUrl: string;
  mimeType: string;
  byteSize: number;
  checksum: string;
  ownerUserId: number;
  metadata?: Record<string, unknown>;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  const result = await db.insert(knowledgeDocuments).values({
    ...input,
    metadata: input.metadata ?? null,
    status: "queued",
  });
  return Number(result[0].insertId);
}

export async function updateDocumentProcessing(input: {
  documentId: number;
  status: "queued" | "processing" | "ready" | "failed" | "archived";
  extractionSummary?: string | null;
  errorMessage?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  await db
    .update(knowledgeDocuments)
    .set({
      status: input.status,
      extractionSummary: input.extractionSummary,
      errorMessage: input.errorMessage,
      processedAt: input.status === "ready" || input.status === "failed" ? new Date() : null,
    })
    .where(eq(knowledgeDocuments.id, input.documentId));
}

export async function replaceDocumentChunks(documentId: number, sourceId: number, chunks: Array<{ content: string; keywordTerms: string; semanticTerms: string; tokenEstimate: number }>) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  await db.delete(knowledgeChunks).where(eq(knowledgeChunks.documentId, documentId));
  if (chunks.length) {
    await db.insert(knowledgeChunks).values(chunks.map((chunk, ordinal) => ({ ...chunk, documentId, sourceId, ordinal })));
  }
}

export async function getAuthorizedCandidates(role: "admin" | "user"): Promise<RetrievalCandidate[]> {
  const db = await getDb();
  if (!db) return [];
  // Administrators may curate draft/archived sources, but retrieval always remains restricted to explicitly approved sources.
  const sourcePermission = role === "admin"
    ? eq(knowledgeSources.approvalStatus, "approved")
    : and(eq(knowledgeSources.approvalStatus, "approved"), eq(knowledgeSources.accessLevel, "all_users"));
  const rows = await db
    .select({
      chunk: knowledgeChunks,
      document: knowledgeDocuments,
      source: knowledgeSources,
    })
    .from(knowledgeChunks)
    .innerJoin(knowledgeDocuments, eq(knowledgeChunks.documentId, knowledgeDocuments.id))
    .innerJoin(knowledgeSources, eq(knowledgeChunks.sourceId, knowledgeSources.id))
    .where(and(eq(knowledgeDocuments.status, "ready"), sourcePermission));
  return rows.map(row => ({
    chunkId: row.chunk.id,
    documentId: row.document.id,
    documentTitle: row.document.title,
    sourceId: row.source.id,
    sourceName: row.source.name,
    content: row.chunk.content,
    keywordTerms: row.chunk.keywordTerms,
    semanticTerms: row.chunk.semanticTerms,
    ordinal: row.chunk.ordinal,
  }));
}

export async function createConversation(ownerUserId: number, title: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  const result = await db.insert(conversations).values({ ownerUserId, title });
  return Number(result[0].insertId);
}

export async function listConversations(ownerUserId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(conversations).where(eq(conversations.ownerUserId, ownerUserId)).orderBy(desc(conversations.updatedAt));
}

export async function getConversationForUser(conversationId: number, ownerUserId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const results = await db.select().from(conversations).where(and(eq(conversations.id, conversationId), eq(conversations.ownerUserId, ownerUserId))).limit(1);
  return results[0];
}

export async function listConversationMessages(conversationId: number, ownerUserId: number) {
  const conversation = await getConversationForUser(conversationId, ownerUserId);
  if (!conversation) return [];
  const db = await getDb();
  if (!db) return [];
  return db.select().from(chatMessages).where(eq(chatMessages.conversationId, conversationId)).orderBy(chatMessages.createdAt);
}

export async function createChatMessage(input: {
  conversationId: number;
  role: "user" | "assistant" | "system";
  content: string;
  status?: "answered" | "insufficient_evidence" | "error";
  citationPayload?: unknown;
  retrievalPayload?: unknown;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  const result = await db.insert(chatMessages).values({
    ...input,
    status: input.status ?? "answered",
    citationPayload: input.citationPayload ?? null,
    retrievalPayload: input.retrievalPayload ?? null,
  });
  await db.update(conversations).set({ updatedAt: new Date() }).where(eq(conversations.id, input.conversationId));
  return Number(result[0].insertId);
}

export async function getMessageForUser(messageId: number, ownerUserId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select({ message: chatMessages })
    .from(chatMessages)
    .innerJoin(conversations, eq(chatMessages.conversationId, conversations.id))
    .where(and(eq(chatMessages.id, messageId), eq(conversations.ownerUserId, ownerUserId)))
    .limit(1);
  return rows[0]?.message;
}

export async function addFeedback(input: { messageId: number; rating: "helpful" | "not_helpful" | "serious_issue"; comment?: string; reporterUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  const result = await db.insert(feedback).values({ ...input, comment: input.comment ?? null });
  return Number(result[0].insertId);
}

export async function createWorkflowDraft(input: { title: string; draftType: "response" | "summary" | "record_update" | "other"; content: string; sourceMessageId?: number; targetSystem?: string; requestedByUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  const result = await db.insert(workflowDrafts).values(buildDraftValues(input));
  return Number(result[0].insertId);
}

export async function listWorkflowDrafts(role: "admin" | "user", userId: number) {
  const db = await getDb();
  if (!db) return [];
  const where = role === "admin" ? undefined : eq(workflowDrafts.requestedByUserId, userId);
  return db.select().from(workflowDrafts).where(where).orderBy(desc(workflowDrafts.createdAt));
}

export async function getWorkflowDraft(draftId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(workflowDrafts).where(eq(workflowDrafts.id, draftId)).limit(1);
  return rows[0];
}

export async function reviewWorkflowDraft(draftId: number, reviewerUserId: number, status: DraftReviewStatus, reviewerNote?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  const draft = await getWorkflowDraft(draftId);
  if (!draft) throw new Error("Workflow draft not found.");
  const review = buildWorkflowReview("admin", draft.status, status, reviewerUserId, reviewerNote);
  await db.update(workflowDrafts).set({ status: review.status, reviewedByUserId: review.reviewedByUserId, reviewerNote: review.reviewerNote, reviewedAt: review.reviewedAt }).where(eq(workflowDrafts.id, draftId));
  return review;
}

export async function listEvaluationCases() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(evaluationCases).where(eq(evaluationCases.status, "active")).orderBy(desc(evaluationCases.updatedAt));
}

export async function createEvaluationCase(input: { name: string; question: string; expectedAnswer?: string; expectedDocumentId?: number; expectedBehavior: "answer" | "decline"; createdByUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  const result = await db.insert(evaluationCases).values({
    ...input,
    expectedAnswer: input.expectedAnswer ?? null,
    expectedDocumentId: input.expectedDocumentId ?? null,
  });
  return Number(result[0].insertId);
}

export async function createEvaluationRun(input: { caseId: number; answer: string; retrievedDocumentIds: number[]; retrievalPass: boolean; behaviorPass: boolean; notes?: string; runByUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  await db.insert(evaluationRuns).values({ ...input, notes: input.notes ?? null });
}

export async function listAuditEvents(limit = 80) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(auditEvents).orderBy(desc(auditEvents.createdAt)).limit(limit);
}

export async function getWorkspaceSummary(role: "admin" | "user", userId: number) {
  const sources = await listKnowledgeSources(role);
  const documents = await listKnowledgeDocuments(role);
  const drafts = await listWorkflowDrafts(role, userId);
  const readyDocuments = documents.filter(row => row.document.status === "ready").length;
  return {
    approvedSources: sources.filter(source => source.approvalStatus === "approved").length,
    readyDocuments,
    processingDocuments: documents.filter(row => row.document.status === "processing" || row.document.status === "queued").length,
    pendingDrafts: drafts.filter(draft => draft.status === "pending_approval").length,
  };
}

export async function createAgentRun(input: { threadId: string; title: string; request: string; taskType: AgentTaskType; riskTier: AgentRiskTier; ownerUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  const result = await db.insert(agentRuns).values({ ...input, status: "running" });
  return Number(result[0].insertId);
}

export async function updateAgentRun(input: { runId: number; status: "running" | "awaiting_approval" | "completed" | "failed" | "blocked" | "cancelled"; plan?: AgentPlan | null; result?: string | null; errorMessage?: string | null; retryCount?: number; complete?: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  await db.update(agentRuns).set({ status: input.status, planPayload: input.plan ?? null, result: input.result ?? null, errorMessage: input.errorMessage ?? null, retryCount: input.retryCount ?? 0, completedAt: input.complete ? new Date() : null }).where(eq(agentRuns.id, input.runId));
}

export async function getAgentRunForUser(runId: number, userId: number, role: "admin" | "user") {
  const db = await getDb();
  if (!db) return undefined;
  const where = role === "admin" ? eq(agentRuns.id, runId) : and(eq(agentRuns.id, runId), eq(agentRuns.ownerUserId, userId));
  const rows = await db.select().from(agentRuns).where(where).limit(1);
  return rows[0];
}

export async function listAgentRuns(userId: number, role: "admin" | "user", limit = 60) {
  const db = await getDb();
  if (!db) return [];
  const where = role === "admin" ? undefined : eq(agentRuns.ownerUserId, userId);
  return db.select().from(agentRuns).where(where).orderBy(desc(agentRuns.updatedAt)).limit(limit);
}

export async function addAgentStateSnapshot(input: { runId: number; node: string; sequence: number; statePayload: unknown }) {
  const db = await getDb();
  if (!db) return;
  await db.insert(agentStateSnapshots).values(input);
}

export async function listAgentStateSnapshots(runId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(agentStateSnapshots).where(eq(agentStateSnapshots.runId, runId)).orderBy(agentStateSnapshots.sequence);
}

export async function createAgentToolCall(input: { runId: number; toolName: AgentToolName; tier: number; inputSummary: string; idempotencyKey: string; status?: "planned" | "allowed" | "blocked" | "succeeded" | "failed" | "awaiting_approval"; outputSummary?: string; durationMs?: number; errorCode?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  const result = await db.insert(agentToolCalls).values({ ...input, status: input.status ?? "planned", outputSummary: input.outputSummary ?? null, durationMs: input.durationMs ?? null, errorCode: input.errorCode ?? null, completedAt: input.status === "succeeded" || input.status === "failed" ? new Date() : null });
  return Number(result[0].insertId);
}

export async function listAgentToolCalls(runId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(agentToolCalls).where(eq(agentToolCalls.runId, runId)).orderBy(agentToolCalls.createdAt);
}

export async function createAgentApproval(input: { runId: number; toolCallId?: number; actionSummary: string; proposedPayload: unknown; requestedByUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  const result = await db.insert(agentApprovals).values({ ...input, toolCallId: input.toolCallId ?? null });
  return Number(result[0].insertId);
}

export async function listAgentApprovals(userId: number, role: "admin" | "user") {
  const db = await getDb();
  if (!db) return [];
  const where = role === "admin" ? undefined : eq(agentApprovals.requestedByUserId, userId);
  return db.select().from(agentApprovals).where(where).orderBy(desc(agentApprovals.createdAt));
}

export async function reviewAgentApproval(input: { approvalId: number; status: "approved" | "rejected"; reviewerUserId: number; reviewerNote?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  const rows = await db.select().from(agentApprovals).where(eq(agentApprovals.id, input.approvalId)).limit(1);
  const approval = rows[0];
  if (!approval) throw new Error("Approval not found.");
  if (approval.status !== "pending") throw new Error("Only a pending approval can be reviewed.");
  await db.update(agentApprovals).set({ status: input.status, reviewedByUserId: input.reviewerUserId, reviewerNote: input.reviewerNote ?? null, reviewedAt: new Date() }).where(eq(agentApprovals.id, input.approvalId));
  await db.update(agentRuns).set({ status: input.status === "approved" ? "completed" : "cancelled", completedAt: new Date() }).where(eq(agentRuns.id, approval.runId));
  return approval;
}

export async function createAgentArtifact(input: { runId: number; artifactType: "research_brief" | "analysis" | "draft" | "plan" | "other"; title: string; content: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  const result = await db.insert(agentArtifacts).values({ ...input });
  return Number(result[0].insertId);
}

export async function listAgentArtifacts(runId?: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(agentArtifacts).where(runId ? eq(agentArtifacts.runId, runId) : undefined).orderBy(desc(agentArtifacts.updatedAt));
}

export async function listAgentMemories(userId: number, role: "admin" | "user") {
  const db = await getDb();
  if (!db) return [];
  const where = role === "admin" ? eq(agentMemories.status, "active") : and(eq(agentMemories.status, "active"), eq(agentMemories.ownerUserId, userId));
  return db.select().from(agentMemories).where(where).orderBy(desc(agentMemories.updatedAt));
}

export async function createAgentMemory(input: { scope: "user" | "firm"; ownerUserId?: number; key: string; content: string; sensitivity: "internal" | "confidential"; createdByUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  const result = await db.insert(agentMemories).values({ ...input, ownerUserId: input.ownerUserId ?? null });
  return Number(result[0].insertId);
}

export async function listAgentIntegrations() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(agentIntegrations).orderBy(desc(agentIntegrations.updatedAt));
}

export async function createAgentEvaluationResult(input: { scenarioName: string; request: string; expectedPolicy: "allow" | "review" | "block"; actualPolicy: "allow" | "review" | "block"; expectedTools?: AgentToolName[]; actualTools: AgentToolName[]; policyPass: boolean; toolPass: boolean; latencyMs: number; runByUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  await db.insert(agentEvaluationResults).values({ ...input, expectedTools: input.expectedTools ?? null });
}

export async function listAgentEvaluationResults(limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(agentEvaluationResults).orderBy(desc(agentEvaluationResults.createdAt)).limit(limit);
}
