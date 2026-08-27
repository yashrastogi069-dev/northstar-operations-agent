import { describe, expect, it } from "vitest";
import { buildAuditEvent } from "./audit";

describe("audit event construction", () => {
  it("builds an append-only provenance record with safe normalized metadata", () => {
    expect(buildAuditEvent({ actorUserId: 7, eventType: "  document.ingested ", entityType: "knowledge_document", entityId: 22, severity: "warning", details: { chunkCount: 4 } })).toEqual({
      actorUserId: 7,
      eventType: "document.ingested",
      entityType: "knowledge_document",
      entityId: "22",
      severity: "warning",
      details: { chunkCount: 4 },
    });
  });

  it("uses a safe information severity and null metadata when optional values are absent", () => {
    expect(buildAuditEvent({ eventType: "chat.answered", entityType: "chat_message" })).toMatchObject({ actorUserId: null, entityId: null, severity: "info", details: null });
  });

  it("rejects incomplete audit events before they can be inserted", () => {
    expect(() => buildAuditEvent({ eventType: " ", entityType: "feedback" })).toThrow("Audit event type is required.");
    expect(() => buildAuditEvent({ eventType: "feedback.submitted", entityType: " " })).toThrow("Audit entity type is required.");
  });
});
