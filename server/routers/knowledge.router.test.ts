import { describe, beforeEach, expect, it, vi } from "vitest";
import type { TrpcContext } from "../_core/context";

const mocks = vi.hoisted(() => ({
  addAuditEvent: vi.fn(), addFeedback: vi.fn(), createKnowledgeDocument: vi.fn(), createKnowledgeSource: vi.fn(), createWorkflowDraft: vi.fn(),
  getKnowledgeSource: vi.fn(), getMessageForUser: vi.fn(), setKnowledgeSourceApproval: vi.fn(), updateDocumentProcessing: vi.fn(), replaceDocumentChunks: vi.fn(),
  storagePut: vi.fn(), notifyOwner: vi.fn(), extractTextFromUpload: vi.fn(),
}));

vi.mock("../db", () => ({
  addAuditEvent: mocks.addAuditEvent, addFeedback: mocks.addFeedback, createKnowledgeDocument: mocks.createKnowledgeDocument,
  createKnowledgeSource: mocks.createKnowledgeSource, createWorkflowDraft: mocks.createWorkflowDraft, getKnowledgeSource: mocks.getKnowledgeSource,
  getMessageForUser: mocks.getMessageForUser, setKnowledgeSourceApproval: mocks.setKnowledgeSourceApproval, updateDocumentProcessing: mocks.updateDocumentProcessing,
  replaceDocumentChunks: mocks.replaceDocumentChunks,
}));
vi.mock("../storage", () => ({ storagePut: mocks.storagePut }));
vi.mock("../_core/notification", () => ({ notifyOwner: mocks.notifyOwner }));
vi.mock("../lib/knowledge", async importOriginal => ({ ...(await importOriginal<typeof import("../lib/knowledge")>()), extractTextFromUpload: mocks.extractTextFromUpload }));

import { knowledgeRouter } from "./knowledge";

function adminContext(): TrpcContext {
  return { user: { id: 7, openId: "admin-test", name: "Admin", email: "admin@example.com", loginMethod: "manus", role: "admin", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: () => undefined } as TrpcContext["res"] };
}

function source(status: "draft" | "approved" | "archived") {
  return { id: 5, name: "Operations", description: null, sourceType: "upload", classification: "internal", accessLevel: "all_users", approvalStatus: status, externalConnection: null, ownerUserId: 7, createdAt: new Date(), updatedAt: new Date() };
}

describe("knowledge-router governance and escalation paths", () => {
  const caller = () => knowledgeRouter.createCaller(adminContext());

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.addAuditEvent.mockResolvedValue(undefined); mocks.notifyOwner.mockResolvedValue(true); mocks.createKnowledgeSource.mockResolvedValue(5); mocks.createWorkflowDraft.mockResolvedValue(12); mocks.addFeedback.mockResolvedValue(18);
  });

  it("creates a governed source, records the audit event, and allows a curator to approve or archive an active source", async () => {
    mocks.getKnowledgeSource.mockResolvedValue(source("draft"));
    await expect(caller().sources.create({ name: "Operations", classification: "internal", accessLevel: "all_users" })).resolves.toEqual({ sourceId: 5 });
    await expect(caller().sources.setApproval({ sourceId: 5, status: "approved" })).resolves.toEqual({ success: true });
    await expect(caller().sources.setApproval({ sourceId: 5, status: "archived" })).resolves.toEqual({ success: true });
    expect(mocks.createKnowledgeSource).toHaveBeenCalledWith(expect.objectContaining({ ownerUserId: 7, name: "Operations" }));
    expect(mocks.setKnowledgeSourceApproval).toHaveBeenCalledWith(5, "archived");
    expect(mocks.addAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: "source.archived", entityType: "knowledge_source" }));
  });

  it("refuses upload into an archived source before writing any file or metadata", async () => {
    mocks.getKnowledgeSource.mockResolvedValue(source("archived"));
    await expect(caller().documents.upload({ sourceId: 5, title: "Policy", filename: "policy.txt", mimeType: "text/plain", base64: Buffer.from("policy").toString("base64"), metadata: { tags: [] } })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mocks.storagePut).not.toHaveBeenCalled();
    expect(mocks.createKnowledgeDocument).not.toHaveBeenCalled();
  });

  it("refuses an unsupported file before writing object storage or document metadata", async () => {
    mocks.getKnowledgeSource.mockResolvedValue(source("approved"));
    await expect(caller().documents.upload({ sourceId: 5, title: "Executable", filename: "unsafe.exe", mimeType: "application/octet-stream", base64: Buffer.from("binary").toString("base64"), metadata: { tags: [] } })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mocks.storagePut).not.toHaveBeenCalled();
    expect(mocks.createKnowledgeDocument).not.toHaveBeenCalled();
  });

  it("records and escalates a document extraction failure after secure storage", async () => {
    mocks.getKnowledgeSource.mockResolvedValue(source("approved")); mocks.storagePut.mockResolvedValue({ key: "knowledge/5/policy.txt", url: "https://storage.example/policy.txt" }); mocks.createKnowledgeDocument.mockResolvedValue(32); mocks.extractTextFromUpload.mockRejectedValue(new Error("No extractable text."));
    const result = await caller().documents.upload({ sourceId: 5, title: "Policy", filename: "policy.txt", mimeType: "text/plain", base64: Buffer.from("policy").toString("base64"), metadata: { tags: [] } });
    expect(result).toEqual({ documentId: 32, status: "failed", errorMessage: "No extractable text." });
    expect(mocks.updateDocumentProcessing).toHaveBeenLastCalledWith({ documentId: 32, status: "failed", errorMessage: "No extractable text.", extractionSummary: null });
    expect(mocks.notifyOwner).toHaveBeenCalledWith(expect.objectContaining({ title: "Knowledge ingestion failed" }));
  });

  it("escalates serious feedback and every new draft while retaining the no-action boundary", async () => {
    mocks.getMessageForUser.mockResolvedValue({ id: 44 });
    await caller().feedback({ messageId: 44, rating: "serious_issue", comment: "Citation requires review." });
    await expect(caller().workflows.create({ title: "Client summary", draftType: "summary", content: "Internal draft only." })).resolves.toEqual({ draftId: 12, status: "pending_approval" });
    expect(mocks.notifyOwner).toHaveBeenCalledWith(expect.objectContaining({ title: "Serious knowledge-agent feedback" }));
    expect(mocks.notifyOwner).toHaveBeenCalledWith(expect.objectContaining({ title: "Draft ready for human review", content: expect.stringContaining("No external action has been performed.") }));
  });
});
