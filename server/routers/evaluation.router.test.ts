import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../_core/context";

const mocks = vi.hoisted(() => ({ addAuditEvent: vi.fn(), createEvaluationCase: vi.fn(), createEvaluationRun: vi.fn(), getAuthorizedCandidates: vi.fn(), listEvaluationCases: vi.fn(), expandRetrievalQuery: vi.fn(), generateEvidenceAnswer: vi.fn(), rankEvidence: vi.fn(), shouldDecline: vi.fn() }));
vi.mock("../db", () => ({ addAuditEvent: mocks.addAuditEvent, createEvaluationCase: mocks.createEvaluationCase, createEvaluationRun: mocks.createEvaluationRun, getAuthorizedCandidates: mocks.getAuthorizedCandidates, listEvaluationCases: mocks.listEvaluationCases }));
vi.mock("../lib/knowledge", async importOriginal => ({ ...(await importOriginal<typeof import("../lib/knowledge")>()), expandRetrievalQuery: mocks.expandRetrievalQuery, generateEvidenceAnswer: mocks.generateEvidenceAnswer, rankEvidence: mocks.rankEvidence, shouldDecline: mocks.shouldDecline }));

import { evaluationRouter } from "./evaluation";

const ctx: TrpcContext = { user: { id: 8, openId: "evaluation-admin", name: "Evaluation admin", email: "admin@example.com", loginMethod: "manus", role: "admin", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: () => undefined } as TrpcContext["res"] };
const evidence = [{ documentId: 51, documentTitle: "Expense policy", sourceId: 2, sourceName: "Operations", content: "Receipts are required.", keywordTerms: "receipt required", semanticTerms: "expense receipt", ordinal: 0, keywordScore: .9, semanticScore: .8, rerankScore: .86, snippet: "Receipts are required." }];

describe("evaluation-router quality regression", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.createEvaluationCase.mockResolvedValue(15); mocks.createEvaluationRun.mockResolvedValue(undefined); mocks.addAuditEvent.mockResolvedValue(undefined); mocks.expandRetrievalQuery.mockImplementation(async (question: string) => question); mocks.getAuthorizedCandidates.mockResolvedValue([]); });

  it("creates and runs an administrator evaluation that verifies expected evidence and an answer", async () => {
    mocks.listEvaluationCases.mockResolvedValue([{ id: 15, name: "Receipt rule", question: "Are receipts required?", expectedAnswer: "Receipts are required.", expectedDocumentId: 51, expectedBehavior: "answer", status: "active" }]); mocks.rankEvidence.mockReturnValue(evidence); mocks.shouldDecline.mockReturnValue(false); mocks.generateEvidenceAnswer.mockResolvedValue("Receipts are required. [1]");
    const caller = evaluationRouter.createCaller(ctx);
    await expect(caller.create({ name: "Receipt rule", question: "Are receipts required?", expectedBehavior: "answer" })).resolves.toEqual({ caseId: 15 });
    await expect(caller.run({ caseId: 15 })).resolves.toMatchObject({ retrievalPass: true, behaviorPass: true, evidence: [{ documentId: 51 }] });
    expect(mocks.createEvaluationRun).toHaveBeenCalledWith(expect.objectContaining({ caseId: 15, retrievalPass: true, behaviorPass: true }));
  });

  it("records a correct decline when the evaluation expects insufficient evidence", async () => {
    mocks.listEvaluationCases.mockResolvedValue([{ id: 16, name: "Unknown budget", question: "What is the future budget?", expectedAnswer: null, expectedDocumentId: null, expectedBehavior: "decline", status: "active" }]); mocks.rankEvidence.mockReturnValue([]); mocks.shouldDecline.mockReturnValue(true);
    const result = await evaluationRouter.createCaller(ctx).run({ caseId: 16 });
    expect(result).toMatchObject({ retrievalPass: true, behaviorPass: true, evidence: [] });
    expect(result.answer).toContain("sufficient approved evidence");
    expect(mocks.generateEvidenceAnswer).not.toHaveBeenCalled();
  });
});
