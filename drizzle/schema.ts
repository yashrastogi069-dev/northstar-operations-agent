import {
  boolean,
  int,
  json,
  mediumtext,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

/** Core user table backing the Manus OAuth flow. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

/** A curated container of documents that is explicitly approved for retrieval. */
export const knowledgeSources = mysqlTable("knowledgeSources", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 180 }).notNull(),
  description: text("description"),
  sourceType: mysqlEnum("sourceType", ["upload", "connector", "manual"]).default("upload").notNull(),
  classification: mysqlEnum("classification", ["internal", "confidential", "restricted"]).default("internal").notNull(),
  accessLevel: mysqlEnum("accessLevel", ["all_users", "admins_only"]).default("all_users").notNull(),
  approvalStatus: mysqlEnum("approvalStatus", ["draft", "approved", "archived"]).default("draft").notNull(),
  externalConnection: varchar("externalConnection", { length: 120 }),
  ownerUserId: int("ownerUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/** Metadata for uploaded or connected firm documents; content bytes stay in object storage. */
export const knowledgeDocuments = mysqlTable("knowledgeDocuments", {
  id: int("id").autoincrement().primaryKey(),
  sourceId: int("sourceId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  originalFilename: varchar("originalFilename", { length: 255 }).notNull(),
  storageKey: varchar("storageKey", { length: 512 }).notNull(),
  storageUrl: varchar("storageUrl", { length: 768 }).notNull(),
  mimeType: varchar("mimeType", { length: 120 }).notNull(),
  byteSize: int("byteSize").notNull(),
  checksum: varchar("checksum", { length: 96 }).notNull(),
  status: mysqlEnum("status", ["queued", "processing", "ready", "failed", "archived"]).default("queued").notNull(),
  metadata: json("metadata"),
  extractionSummary: text("extractionSummary"),
  errorMessage: text("errorMessage"),
  ownerUserId: int("ownerUserId").notNull(),
  uploadedAt: timestamp("uploadedAt").defaultNow().notNull(),
  processedAt: timestamp("processedAt"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/** Searchable text fragments. semanticTerms contains LLM-extracted concepts used in semantic expansion. */
export const knowledgeChunks = mysqlTable("knowledgeChunks", {
  id: int("id").autoincrement().primaryKey(),
  documentId: int("documentId").notNull(),
  sourceId: int("sourceId").notNull(),
  ordinal: int("ordinal").notNull(),
  content: mediumtext("content").notNull(),
  keywordTerms: text("keywordTerms").notNull(),
  semanticTerms: text("semanticTerms").notNull(),
  tokenEstimate: int("tokenEstimate").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const conversations = mysqlTable("conversations", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 180 }).notNull(),
  ownerUserId: int("ownerUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const chatMessages = mysqlTable("chatMessages", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull(),
  role: mysqlEnum("role", ["user", "assistant", "system"]).notNull(),
  content: mediumtext("content").notNull(),
  citationPayload: json("citationPayload"),
  retrievalPayload: json("retrievalPayload"),
  status: mysqlEnum("status", ["answered", "insufficient_evidence", "error"]).default("answered").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const feedback = mysqlTable("feedback", {
  id: int("id").autoincrement().primaryKey(),
  messageId: int("messageId").notNull(),
  rating: mysqlEnum("rating", ["helpful", "not_helpful", "serious_issue"]).notNull(),
  comment: text("comment"),
  reporterUserId: int("reporterUserId").notNull(),
  reviewed: boolean("reviewed").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/** Append-only operational event record. Application code intentionally exposes insert-only helpers. */
export const auditEvents = mysqlTable("auditEvents", {
  id: int("id").autoincrement().primaryKey(),
  actorUserId: int("actorUserId"),
  eventType: varchar("eventType", { length: 100 }).notNull(),
  entityType: varchar("entityType", { length: 100 }).notNull(),
  entityId: varchar("entityId", { length: 100 }),
  severity: mysqlEnum("severity", ["info", "warning", "high"]).default("info").notNull(),
  details: json("details"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const evaluationCases = mysqlTable("evaluationCases", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 180 }).notNull(),
  question: text("question").notNull(),
  expectedAnswer: text("expectedAnswer"),
  expectedDocumentId: int("expectedDocumentId"),
  expectedBehavior: mysqlEnum("expectedBehavior", ["answer", "decline"]).default("answer").notNull(),
  status: mysqlEnum("status", ["active", "archived"]).default("active").notNull(),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const evaluationRuns = mysqlTable("evaluationRuns", {
  id: int("id").autoincrement().primaryKey(),
  caseId: int("caseId").notNull(),
  answer: mediumtext("answer").notNull(),
  retrievedDocumentIds: json("retrievedDocumentIds").notNull(),
  retrievalPass: boolean("retrievalPass").notNull(),
  behaviorPass: boolean("behaviorPass").notNull(),
  notes: text("notes"),
  runByUserId: int("runByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/** Drafts never perform external actions. They await a human decision by design. */
export const workflowDrafts = mysqlTable("workflowDrafts", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  draftType: mysqlEnum("draftType", ["response", "summary", "record_update", "other"]).default("response").notNull(),
  content: mediumtext("content").notNull(),
  sourceMessageId: int("sourceMessageId"),
  targetSystem: varchar("targetSystem", { length: 100 }),
  status: mysqlEnum("status", ["pending_approval", "approved", "rejected", "cancelled"]).default("pending_approval").notNull(),
  requestedByUserId: int("requestedByUserId").notNull(),
  reviewedByUserId: int("reviewedByUserId"),
  reviewerNote: text("reviewerNote"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  reviewedAt: timestamp("reviewedAt"),
});

/** Durable state for one bounded LangGraph agent run. */
export const agentRuns = mysqlTable("agentRuns", {
  id: int("id").autoincrement().primaryKey(),
  threadId: varchar("threadId", { length: 96 }).notNull().unique(),
  title: varchar("title", { length: 220 }).notNull(),
  request: mediumtext("request").notNull(),
  taskType: mysqlEnum("taskType", ["knowledge", "research", "analysis", "draft", "mixed"]).default("mixed").notNull(),
  riskTier: mysqlEnum("riskTier", ["low", "review", "blocked"]).default("low").notNull(),
  status: mysqlEnum("status", ["running", "awaiting_approval", "completed", "failed", "blocked", "cancelled"]).default("running").notNull(),
  planPayload: json("planPayload"),
  result: mediumtext("result"),
  errorMessage: text("errorMessage"),
  retryCount: int("retryCount").default(0).notNull(),
  recoveryOfRunId: int("recoveryOfRunId").unique(),
  ownerUserId: int("ownerUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  completedAt: timestamp("completedAt"),
});

/** Immutable graph snapshots enable review and recovery from the last safe node. */
export const agentStateSnapshots = mysqlTable("agentStateSnapshots", {
  id: int("id").autoincrement().primaryKey(),
  runId: int("runId").notNull(),
  node: varchar("node", { length: 100 }).notNull(),
  sequence: int("sequence").notNull(),
  statePayload: json("statePayload").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/** Tool intent and sanitized result summaries; raw secrets and sensitive payloads are excluded. */
export const agentToolCalls = mysqlTable("agentToolCalls", {
  id: int("id").autoincrement().primaryKey(),
  runId: int("runId").notNull(),
  toolName: varchar("toolName", { length: 100 }).notNull(),
  tier: int("tier").notNull(),
  inputSummary: text("inputSummary").notNull(),
  outputSummary: text("outputSummary"),
  status: mysqlEnum("status", ["planned", "allowed", "blocked", "succeeded", "failed", "awaiting_approval"]).default("planned").notNull(),
  idempotencyKey: varchar("idempotencyKey", { length: 128 }).notNull(),
  durationMs: int("durationMs"),
  errorCode: varchar("errorCode", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

/** A human decision is required before any tier-3 connected-system effect. */
export const agentApprovals = mysqlTable("agentApprovals", {
  id: int("id").autoincrement().primaryKey(),
  runId: int("runId").notNull(),
  toolCallId: int("toolCallId"),
  actionSummary: text("actionSummary").notNull(),
  proposedPayload: json("proposedPayload").notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected", "cancelled"]).default("pending").notNull(),
  requestedByUserId: int("requestedByUserId").notNull(),
  reviewedByUserId: int("reviewedByUserId"),
  reviewerNote: text("reviewerNote"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  reviewedAt: timestamp("reviewedAt"),
});

/** Explicit, scoped long-term memories. Untrusted retrieval and tool output never auto-promotes here. */
export const agentMemories = mysqlTable("agentMemories", {
  id: int("id").autoincrement().primaryKey(),
  scope: mysqlEnum("scope", ["user", "firm"]).notNull(),
  ownerUserId: int("ownerUserId"),
  key: varchar("key", { length: 180 }).notNull(),
  content: text("content").notNull(),
  sensitivity: mysqlEnum("sensitivity", ["internal", "confidential"]).default("internal").notNull(),
  status: mysqlEnum("status", ["active", "archived"]).default("active").notNull(),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/** Internal-only agent outputs that can be reviewed and approved as workflow drafts. */
export const agentArtifacts = mysqlTable("agentArtifacts", {
  id: int("id").autoincrement().primaryKey(),
  runId: int("runId").notNull(),
  artifactType: mysqlEnum("artifactType", ["research_brief", "analysis", "draft", "plan", "other"]).default("other").notNull(),
  title: varchar("title", { length: 220 }).notNull(),
  content: mediumtext("content").notNull(),
  status: mysqlEnum("status", ["draft", "reviewed", "archived"]).default("draft").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/** Credential-free connection metadata. Secrets are configured outside the database. */
export const agentIntegrations = mysqlTable("agentIntegrations", {
  id: int("id").autoincrement().primaryKey(),
  provider: varchar("provider", { length: 120 }).notNull(),
  displayName: varchar("displayName", { length: 180 }).notNull(),
  capability: mysqlEnum("capability", ["read_only", "draft_only", "approval_required"]).default("read_only").notNull(),
  status: mysqlEnum("status", ["disabled", "ready", "connected", "error"]).default("disabled").notNull(),
  allowedResources: json("allowedResources"),
  lastHealthCheckAt: timestamp("lastHealthCheckAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/** Quantitative evaluation result for the agent’s policy and routing behavior. */
export const agentEvaluationResults = mysqlTable("agentEvaluationResults", {
  id: int("id").autoincrement().primaryKey(),
  scenarioName: varchar("scenarioName", { length: 180 }).notNull(),
  request: text("request").notNull(),
  expectedPolicy: mysqlEnum("expectedPolicy", ["allow", "review", "block"]).notNull(),
  actualPolicy: mysqlEnum("actualPolicy", ["allow", "review", "block"]).notNull(),
  expectedTools: json("expectedTools"),
  actualTools: json("actualTools").notNull(),
  policyPass: boolean("policyPass").notNull(),
  toolPass: boolean("toolPass").notNull(),
  latencyMs: int("latencyMs").notNull(),
  runByUserId: int("runByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/** Human feedback on an agent run; retained separately from source-chat feedback. */
export const agentRunFeedback = mysqlTable("agentRunFeedback", {
  id: int("id").autoincrement().primaryKey(),
  runId: int("runId").notNull(),
  rating: mysqlEnum("rating", ["helpful", "not_helpful", "safety_concern"]).notNull(),
  comment: text("comment"),
  reporterUserId: int("reporterUserId").notNull(),
  reviewed: boolean("reviewed").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type KnowledgeSource = typeof knowledgeSources.$inferSelect;
export type KnowledgeDocument = typeof knowledgeDocuments.$inferSelect;
export type KnowledgeChunk = typeof knowledgeChunks.$inferSelect;
export type AgentRun = typeof agentRuns.$inferSelect;
