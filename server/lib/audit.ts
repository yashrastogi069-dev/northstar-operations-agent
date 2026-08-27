export type AuditEventInput = {
  actorUserId?: number | null;
  eventType: string;
  entityType: string;
  entityId?: string | number | null;
  severity?: "info" | "warning" | "high";
  details?: Record<string, unknown>;
};

/** Builds the insert-only event record used for operational provenance. */
export function buildAuditEvent(input: AuditEventInput) {
  if (!input.eventType.trim()) throw new Error("Audit event type is required.");
  if (!input.entityType.trim()) throw new Error("Audit entity type is required.");
  return {
    actorUserId: input.actorUserId ?? null,
    eventType: input.eventType.trim(),
    entityType: input.entityType.trim(),
    entityId: input.entityId === undefined || input.entityId === null ? null : String(input.entityId),
    severity: input.severity ?? "info",
    details: input.details ?? null,
  };
}
