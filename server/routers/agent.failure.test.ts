import { describe, expect, it } from "vitest";
import { userSafeFailureReason } from "./agent";

describe("Agent Desk failure diagnostics", () => {
  it("reports schema drift for missing-column query failures", () => {
    const reason = userSafeFailureReason("Failed query: Unknown column 'knowledgeChunks.embedding' in 'field list'");
    expect(reason).toContain("schema is out of date");
    expect(reason).toContain("Apply the pending Drizzle migration");
    expect(reason).not.toContain("TLS");
  });

  it("keeps connection failures separate from schema failures", () => {
    const reason = userSafeFailureReason("connect ETIMEDOUT gateway.tidbcloud.com:4000");
    expect(reason).toContain("database could not be reached");
    expect(reason).toContain("TLS settings");
  });

  it("does not expose provider credentials in user-facing diagnostics", () => {
    const reason = userSafeFailureReason("OpenRouter rejected request with api_key=super-secret-value");
    expect(reason).toContain("model provider");
    expect(reason).not.toContain("super-secret-value");
  });
});
