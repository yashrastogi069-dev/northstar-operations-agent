import { describe, expect, it } from "vitest";
import { buildDraftReadyAlert, buildIngestionFailedAlert, buildSeriousFeedbackAlert } from "./notifications";

describe("owner alert triggers", () => {
  it("builds an actionable ingestion-failure alert", () => {
    expect(buildIngestionFailedAlert("Travel policy.pdf", "No extractable text.")).toEqual({ title: "Knowledge ingestion failed", content: "Document “Travel policy.pdf” could not be ingested. Reason: No extractable text." });
  });

  it("builds a high-priority review alert for serious feedback", () => {
    expect(buildSeriousFeedbackAlert(42)).toMatchObject({ title: "Serious knowledge-agent feedback", content: expect.stringContaining("chat message 42") });
  });

  it("makes the draft-only boundary explicit in every review-ready alert", () => {
    expect(buildDraftReadyAlert("Client response").content).toContain("No external action has been performed.");
  });
});
