import { describe, expect, it } from "vitest";
import { canRetrieveSource, canReviewWorkflowDraft, isExternalActionAllowed } from "./controls";

describe("firm knowledge controls", () => {
  it("excludes draft and archived sources from every user", () => {
    expect(canRetrieveSource("admin", "draft", "all_users")).toBe(false);
    expect(canRetrieveSource("user", "archived", "all_users")).toBe(false);
  });

  it("protects administrator-only approved knowledge from ordinary users", () => {
    expect(canRetrieveSource("user", "approved", "admins_only")).toBe(false);
    expect(canRetrieveSource("admin", "approved", "admins_only")).toBe(true);
    expect(canRetrieveSource("user", "approved", "all_users")).toBe(true);
  });

  it("does not let administrators retrieve unapproved material while they curate it", () => {
    expect(canRetrieveSource("admin", "draft", "admins_only")).toBe(false);
    expect(canRetrieveSource("admin", "archived", "all_users")).toBe(false);
  });

  it("never permits automated external action and limits draft review to administrators", () => {
    expect(isExternalActionAllowed()).toBe(false);
    expect(canReviewWorkflowDraft("user")).toBe(false);
    expect(canReviewWorkflowDraft("admin")).toBe(true);
  });
});
