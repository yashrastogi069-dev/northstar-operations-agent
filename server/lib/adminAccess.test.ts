import { describe, expect, it } from "vitest";
import { isConfiguredAdmin } from "./adminAccess";

describe("configured administrator access", () => {
  it("accepts a configured email without requiring a generated database id", () => {
    expect(isConfiguredAdmin({ openId: "oidc|123", email: "Admin@Example.com" }, { adminEmails: "admin@example.com" })).toBe(true);
  });

  it("accepts the configured owner subject and rejects unrelated identities", () => {
    expect(isConfiguredAdmin({ openId: "owner-sub", email: "other@example.com" }, { ownerOpenId: "owner-sub", adminEmails: "" })).toBe(true);
    expect(isConfiguredAdmin({ openId: "other-sub", email: "other@example.com" }, { ownerOpenId: "owner-sub", adminEmails: "admin@example.com" })).toBe(false);
  });
});
