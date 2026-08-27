export type FirmRole = "admin" | "user";
export type SourceAccessLevel = "all_users" | "admins_only";
export type SourceApprovalStatus = "draft" | "approved" | "archived";

/** Mirrors the retrieval gate enforced by the data layer. */
export function canRetrieveSource(role: FirmRole, approvalStatus: SourceApprovalStatus, accessLevel: SourceAccessLevel): boolean {
  if (approvalStatus !== "approved") return false;
  return accessLevel === "all_users" || role === "admin";
}

/** Approval records a human decision. It deliberately never authorizes an external action. */
export function isExternalActionAllowed(): false {
  return false;
}

export function canReviewWorkflowDraft(role: FirmRole): boolean {
  return role === "admin";
}
