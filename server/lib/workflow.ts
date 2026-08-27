import { canReviewWorkflowDraft, isExternalActionAllowed, type FirmRole } from "./controls";

export type DraftType = "response" | "summary" | "record_update" | "other";
export type DraftReviewStatus = "approved" | "rejected";
export type WorkflowStatus = "pending_approval" | "approved" | "rejected" | "cancelled";

export function buildDraftValues(input: { title: string; draftType: DraftType; content: string; sourceMessageId?: number; targetSystem?: string; requestedByUserId: number }) {
  if (!input.title.trim() || !input.content.trim()) throw new Error("A workflow draft requires a title and content.");
  return {
    title: input.title.trim(),
    draftType: input.draftType,
    content: input.content.trim(),
    sourceMessageId: input.sourceMessageId ?? null,
    targetSystem: input.targetSystem?.trim() || null,
    requestedByUserId: input.requestedByUserId,
    status: "pending_approval" as const,
  };
}

export function buildWorkflowReview(role: FirmRole, currentStatus: WorkflowStatus, status: DraftReviewStatus, reviewerUserId: number, reviewerNote?: string) {
  if (!canReviewWorkflowDraft(role)) throw new Error("Only administrators can review workflow drafts.");
  if (currentStatus !== "pending_approval") throw new Error("Only pending drafts can be reviewed.");
  return {
    status,
    reviewedByUserId: reviewerUserId,
    reviewerNote: reviewerNote?.trim() || null,
    reviewedAt: new Date(),
    externalActionPerformed: isExternalActionAllowed(),
  };
}
