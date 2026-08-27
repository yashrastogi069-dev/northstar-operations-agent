import { describe, expect, it } from "vitest";
import { buildSemanticTerms, chunkText, isSupportedUpload, rankEvidence, shouldDecline, tokenize } from "./knowledge";

const candidates = [
  {
    chunkId: 1,
    documentId: 1,
    documentTitle: "Travel and expenses policy",
    sourceId: 1,
    sourceName: "Operations handbook",
    content: "Employees may claim reasonable rail travel expenses when receipts are submitted within thirty days.",
    keywordTerms: "employee claim reasonable rail travel expense receipt submit thirty day",
    semanticTerms: "travel expenses reimbursement receipts policy operations handbook",
    ordinal: 0,
  },
  {
    chunkId: 2,
    documentId: 2,
    documentTitle: "Information security standard",
    sourceId: 2,
    sourceName: "Security library",
    content: "Multi-factor authentication is required for access to production systems.",
    keywordTerms: "multi factor authentication require access production system",
    semanticTerms: "security identity access authentication standard",
    ordinal: 0,
  },
];

describe("hybrid knowledge retrieval", () => {
  it("ranks semantically related approved evidence above unrelated content", () => {
    const ranked = rankEvidence("How are rail travel costs reimbursed?", candidates);
    expect(ranked[0]?.documentId).toBe(1);
    expect(ranked[0]?.keywordScore).toBeGreaterThan(0);
    expect(ranked[0]?.semanticScore).toBeGreaterThan(0);
  });

  it("declines when no approved evidence is relevant", () => {
    expect(shouldDecline(rankEvidence("What is the marketing budget for next year?", candidates))).toBe(true);
  });

  it("chunks long text with overlap for recoverable retrieval context", () => {
    const chunks = chunkText("A ".repeat(1700), 400, 50);
    expect(chunks.length).toBeGreaterThan(2);
    expect(chunks.every(chunk => chunk.length <= 400)).toBe(true);
  });

  it("normalizes semantic indexing terms and removes low-value query words", () => {
    expect(tokenize("What is the policy for travel and expenses?")).toEqual(expect.arrayContaining(["policy", "travel", "expense"]));
    expect(tokenize("What is the policy for travel and expenses?")).not.toContain("what");
    expect(buildSemanticTerms("Travel policy", "Employees submit expense receipts")).toContain("travel");
  });

  it("accepts approved document formats and rejects unsupported upload types", () => {
    expect(isSupportedUpload("application/pdf", "policy.pdf")).toBe(true);
    expect(isSupportedUpload("text/plain", "policy.txt")).toBe(true);
    expect(isSupportedUpload("application/octet-stream", "upload.exe")).toBe(false);
  });
});
