import { describe, expect, it } from "vitest";
import { userSafeFailureReason } from "./agent";

describe("Agent Desk failure diagnostics", () => {
  it("categorizes database failures with an actionable Render hint", () => {
    const message = userSafeFailureReason("connect ECONNREFUSED database host");
    expect(message).toContain("DATABASE_URL");
    expect(message).not.toContain("password");
  });

  it("categorizes model-provider failures without echoing secrets", () => {
    const message = userSafeFailureReason("OpenRouter returned 401 for api_key=sk-secret-value");
    expect(message).toContain("OpenRouter");
    expect(message).not.toContain("sk-secret-value");
  });
});
