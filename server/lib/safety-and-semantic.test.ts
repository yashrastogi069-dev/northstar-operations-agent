import { describe, expect, it } from "vitest";
import { createDeterministicPlan, isExplicitPublicResearchRequest, isInternalFirmRequest } from "./agentPolicy";
import { cosineSimilarity, normalizedSemanticScore, parseEmbedding } from "./semanticSearch";

describe("Northstar routing safety boundary", () => {
  it("treats a Northstar marketing-budget question as internal firm work", () => {
    const request = "What's Northstar's marketing budget?";
    expect(isInternalFirmRequest(request)).toBe(true);
    expect(isExplicitPublicResearchRequest(request)).toBe(false);
    const plan = createDeterministicPlan(request, { allowed: true, riskTier: "low", reason: "test", taskType: "knowledge" });
    expect(plan.tools).toEqual(["knowledge_search"]);
    expect(plan.tools).not.toContain("public_research");
  });

  it("requires explicit consent before a genuinely public request reaches public research", () => {
    const request = "Research the current background on sustainable aviation fuel.";
    const decision = { allowed: true, riskTier: "low" as const, reason: "test", taskType: "research" as const };
    expect(createDeterministicPlan(request, decision).requiresPublicResearchConsent).toBe(true);
    expect(createDeterministicPlan(request, decision).tools).not.toContain("public_research");
    expect(createDeterministicPlan(request, decision, false, true).tools).toContain("public_research");
  });
});

describe("Northstar semantic scoring", () => {
  it("ranks matching vectors above orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBe(1);
    expect(cosineSimilarity([1, 0, 0], [0, 1, 0])).toBe(0);
    expect(normalizedSemanticScore(1)).toBe(1);
  });

  it("rejects malformed persisted vectors instead of crashing retrieval", () => {
    expect(parseEmbedding("not-json")).toBeNull();
    expect(parseEmbedding([1, "bad"])).toBeNull();
    expect(parseEmbedding(JSON.stringify([0.1, 0.2]))).toEqual([0.1, 0.2]);
  });
});
