import crypto from "node:crypto";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  addAuditEvent,
  addFeedback,
  createChatMessage,
  createConversation,
  createKnowledgeDocument,
  createKnowledgeSource,
  createWorkflowDraft,
  getAuthorizedCandidates,
  getConversationForUser,
  getKnowledgeSource,
  getMessageForUser,
  getWorkspaceSummary,
  listAuditEvents,
  listConversationMessages,
  listConversations,
  listKnowledgeDocuments,
  listKnowledgeSources,
  listWorkflowDrafts,
  replaceDocumentChunks,
  reviewWorkflowDraft,
  setKnowledgeSourceApproval,
  updateDocumentProcessing,
} from "../db";
import { notifyOwner } from "../_core/notification";
import { buildDraftReadyAlert, buildIngestionFailedAlert, buildSeriousFeedbackAlert } from "../lib/notifications";
import { storagePut } from "../storage";
import { buildSemanticTerms, chunkText, expandRetrievalQuery, extractTextFromUpload, generateEvidenceAnswer, isSupportedUpload, rankEvidence, shouldDecline, tokenize } from "../lib/knowledge";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";

const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
const sourceInput = z.object({
  name: z.string().trim().min(3).max(180),
  description: z.string().trim().max(1600).optional(),
  classification: z.enum(["internal", "confidential", "restricted"]),
  accessLevel: z.enum(["all_users", "admins_only"]),
});

function assertApprovedSource(source: Awaited<ReturnType<typeof getKnowledgeSource>>) {
  if (!source) throw new TRPCError({ code: "NOT_FOUND", message: "Knowledge source not found." });
  if (source.approvalStatus === "archived") throw new TRPCError({ code: "BAD_REQUEST", message: "Archived sources cannot accept documents." });
  return source;
}

export const knowledgeRouter = router({
  workspace: protectedProcedure.query(async ({ ctx }) => getWorkspaceSummary(ctx.user.role, ctx.user.id)),
  sources: router({
    list: protectedProcedure.query(async ({ ctx }) => listKnowledgeSources(ctx.user.role)),
    create: adminProcedure.input(sourceInput).mutation(async ({ ctx, input }) => {
      const sourceId = await createKnowledgeSource({ ...input, ownerUserId: ctx.user.id });
      await addAuditEvent({ actorUserId: ctx.user.id, eventType: "source.created", entityType: "knowledge_source", entityId: sourceId, details: { classification: input.classification, accessLevel: input.accessLevel } });
      return { sourceId };
    }),
    setApproval: adminProcedure.input(z.object({ sourceId: z.number().int().positive(), status: z.enum(["draft", "approved", "archived"]) })).mutation(async ({ ctx, input }) => {
      const source = assertApprovedSource(await getKnowledgeSource(input.sourceId));
      await setKnowledgeSourceApproval(input.sourceId, input.status);
      await addAuditEvent({ actorUserId: ctx.user.id, eventType: `source.${input.status}`, entityType: "knowledge_source", entityId: input.sourceId, details: { sourceName: source.name } });
      return { success: true };
    }),
  }),
  documents: router({
    list: protectedProcedure.query(async ({ ctx }) => listKnowledgeDocuments(ctx.user.role)),
    upload: adminProcedure.input(z.object({
      sourceId: z.number().int().positive(),
      title: z.string().trim().min(2).max(255),
      filename: z.string().trim().min(1).max(255),
      mimeType: z.string().trim().min(1).max(120),
      base64: z.string().min(1).max(17_000_000),
      metadata: z.object({ tags: z.array(z.string().trim().min(1).max(40)).max(12).default([]) }).default({ tags: [] }),
    })).mutation(async ({ ctx, input }) => {
      const source = assertApprovedSource(await getKnowledgeSource(input.sourceId));
      if (!isSupportedUpload(input.mimeType, input.filename)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Supported formats are PDF, DOCX, XLS/XLSX, CSV, TXT, Markdown, and JSON." });
      }
      const buffer = Buffer.from(input.base64.replace(/^data:[^;]+;base64,/, ""), "base64");
      if (!buffer.length || buffer.length > MAX_UPLOAD_BYTES) {
        throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Upload must be between 1 byte and 12 MB." });
      }
      const checksum = crypto.createHash("sha256").update(buffer).digest("hex");
      const safeFilename = input.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
      const stored = await storagePut(`knowledge/${source.id}/${Date.now()}_${safeFilename}`, buffer, input.mimeType);
      const documentId = await createKnowledgeDocument({
        sourceId: source.id,
        title: input.title,
        originalFilename: input.filename,
        storageKey: stored.key,
        storageUrl: stored.url,
        mimeType: input.mimeType,
        byteSize: buffer.length,
        checksum,
        ownerUserId: ctx.user.id,
        metadata: { tags: input.metadata.tags, sourceClassification: source.classification },
      });
      await addAuditEvent({ actorUserId: ctx.user.id, eventType: "document.uploaded", entityType: "knowledge_document", entityId: documentId, details: { sourceId: source.id, checksum, byteSize: buffer.length } });
      await updateDocumentProcessing({ documentId, status: "processing" });
      try {
        const text = await extractTextFromUpload(buffer, input.mimeType, input.filename);
        const chunks = chunkText(text);
        if (!chunks.length) throw new Error("No extractable text was found in this document.");
        await replaceDocumentChunks(documentId, source.id, chunks.map(content => ({
          content,
          keywordTerms: tokenize(content).join(" "),
          semanticTerms: buildSemanticTerms(input.title, content),
          tokenEstimate: Math.ceil(content.length / 4),
        })));
        await updateDocumentProcessing({ documentId, status: "ready", extractionSummary: `${chunks.length} searchable passages prepared from ${text.length.toLocaleString()} characters.`, errorMessage: null });
        await addAuditEvent({ actorUserId: ctx.user.id, eventType: "document.ingested", entityType: "knowledge_document", entityId: documentId, details: { sourceId: source.id, chunkCount: chunks.length, sourceApproval: source.approvalStatus } });
        return { documentId, status: "ready" as const, chunkCount: chunks.length };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unexpected ingestion failure.";
        await updateDocumentProcessing({ documentId, status: "failed", errorMessage, extractionSummary: null });
        await addAuditEvent({ actorUserId: ctx.user.id, eventType: "document.ingestion_failed", entityType: "knowledge_document", entityId: documentId, severity: "high", details: { sourceId: source.id, errorMessage } });
        await notifyOwner(buildIngestionFailedAlert(input.title, errorMessage)).catch(() => false);
        return { documentId, status: "failed" as const, errorMessage };
      }
    }),
  }),
  conversations: router({
    list: protectedProcedure.query(async ({ ctx }) => listConversations(ctx.user.id)),
    create: protectedProcedure.input(z.object({ title: z.string().trim().min(2).max(180) })).mutation(async ({ ctx, input }) => {
      const conversationId = await createConversation(ctx.user.id, input.title);
      await addAuditEvent({ actorUserId: ctx.user.id, eventType: "conversation.created", entityType: "conversation", entityId: conversationId });
      return { conversationId };
    }),
    messages: protectedProcedure.input(z.object({ conversationId: z.number().int().positive() })).query(async ({ ctx, input }) => listConversationMessages(input.conversationId, ctx.user.id)),
  }),
  agentModes: protectedProcedure.query(() => ([
    { id: "answer", label: "Evidence answer", description: "Answers a firm question with citations from approved sources." },
    { id: "compare", label: "Compare sources", description: "Identifies agreement, differences, and open conflicts between approved sources." },
    { id: "draft", label: "Policy-aware draft", description: "Creates an internal-only draft; human review is required before use." },
    { id: "plan", label: "Controlled plan", description: "Creates a research or action plan that names human approval checkpoints." },
  ] as const)),
  ask: protectedProcedure.input(z.object({ question: z.string().trim().min(3).max(4000), conversationId: z.number().int().positive().optional(), mode: z.enum(["answer", "compare", "draft", "plan"]).default("answer") })).mutation(async ({ ctx, input }) => {
    let conversationId = input.conversationId;
    if (conversationId) {
      const conversation = await getConversationForUser(conversationId, ctx.user.id);
      if (!conversation) throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found." });
    } else {
      conversationId = await createConversation(ctx.user.id, input.question.slice(0, 76));
    }
    await createChatMessage({ conversationId, role: "user", content: input.question });
    const retrievalQuery = await expandRetrievalQuery(input.question);
    const evidence = rankEvidence(retrievalQuery, await getAuthorizedCandidates(ctx.user.role));
    const insufficient = shouldDecline(evidence);
    const answer = insufficient
      ? "I don’t have sufficient approved evidence to answer that. Add or approve a source that directly addresses this question, then try again."
      : await generateEvidenceAnswer(input.question, evidence, input.mode);
    const status = insufficient || answer.startsWith("I don’t have sufficient approved evidence") ? "insufficient_evidence" : "answered";
    const citationPayload = evidence.map((item, index) => ({ number: index + 1, documentId: item.documentId, documentTitle: item.documentTitle, sourceId: item.sourceId, sourceName: item.sourceName, excerpt: item.snippet, confidence: Math.round(item.rerankScore * 100) }));
    const messageId = await createChatMessage({ conversationId, role: "assistant", content: answer, status, citationPayload, retrievalPayload: { candidateCount: evidence.length, retrievalMode: "keyword + semantic query expansion + rerank", mode: input.mode } });
    await addAuditEvent({ actorUserId: ctx.user.id, eventType: "chat.answered", entityType: "chat_message", entityId: messageId, severity: insufficient ? "warning" : "info", details: { conversationId, status, agentMode: input.mode, retrievedDocumentIds: evidence.map(item => item.documentId), retrievedSourceIds: evidence.map(item => item.sourceId) } });
    return { conversationId, messageId, answer, status, mode: input.mode, citations: citationPayload };
  }),
  feedback: protectedProcedure.input(z.object({ messageId: z.number().int().positive(), rating: z.enum(["helpful", "not_helpful", "serious_issue"]), comment: z.string().trim().max(1200).optional() })).mutation(async ({ ctx, input }) => {
    const message = await getMessageForUser(input.messageId, ctx.user.id);
    if (!message) throw new TRPCError({ code: "NOT_FOUND", message: "Message not found." });
    const feedbackId = await addFeedback({ ...input, reporterUserId: ctx.user.id });
    const severity = input.rating === "serious_issue" ? "high" : input.rating === "not_helpful" ? "warning" : "info";
    await addAuditEvent({ actorUserId: ctx.user.id, eventType: "feedback.submitted", entityType: "feedback", entityId: feedbackId, severity, details: { messageId: input.messageId, rating: input.rating } });
    if (input.rating === "serious_issue") {
      await notifyOwner(buildSeriousFeedbackAlert(input.messageId)).catch(() => false);
    }
    return { feedbackId };
  }),
  workflows: router({
    list: protectedProcedure.query(async ({ ctx }) => listWorkflowDrafts(ctx.user.role, ctx.user.id)),
    create: protectedProcedure.input(z.object({ title: z.string().trim().min(3).max(200), draftType: z.enum(["response", "summary", "record_update", "other"]), content: z.string().trim().min(5).max(20000), sourceMessageId: z.number().int().positive().optional(), targetSystem: z.string().trim().max(100).optional() })).mutation(async ({ ctx, input }) => {
      if (input.sourceMessageId && !(await getMessageForUser(input.sourceMessageId, ctx.user.id))) {
        throw new TRPCError({ code: "NOT_FOUND", message: "The selected source answer is not available." });
      }
      const draftId = await createWorkflowDraft({ ...input, requestedByUserId: ctx.user.id });
      await addAuditEvent({ actorUserId: ctx.user.id, eventType: "workflow.draft_created", entityType: "workflow_draft", entityId: draftId, details: { draftType: input.draftType, targetSystem: input.targetSystem ?? "internal draft" } });
      await notifyOwner(buildDraftReadyAlert(input.title)).catch(() => false);
      return { draftId, status: "pending_approval" as const };
    }),
    review: adminProcedure.input(z.object({ draftId: z.number().int().positive(), status: z.enum(["approved", "rejected"]), reviewerNote: z.string().trim().max(1200).optional() })).mutation(async ({ ctx, input }) => {
      const review = await reviewWorkflowDraft(input.draftId, ctx.user.id, input.status, input.reviewerNote);
      await addAuditEvent({ actorUserId: ctx.user.id, eventType: `workflow.draft_${input.status}`, entityType: "workflow_draft", entityId: input.draftId, details: { automatedAction: false } });
      return { success: true, externalActionPerformed: review.externalActionPerformed };
    }),
  }),
  audit: adminProcedure.input(z.object({ limit: z.number().int().min(1).max(200).default(80) })).query(async ({ input }) => listAuditEvents(input.limit)),
});
