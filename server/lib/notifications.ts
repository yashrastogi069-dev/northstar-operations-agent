export type OwnerAlert = { title: string; content: string };

export function buildIngestionFailedAlert(documentTitle: string, reason: string): OwnerAlert {
  return { title: "Knowledge ingestion failed", content: `Document “${documentTitle}” could not be ingested. Reason: ${reason}` };
}

export function buildSeriousFeedbackAlert(messageId: number): OwnerAlert {
  return { title: "Serious knowledge-agent feedback", content: `A user reported a serious issue with chat message ${messageId}. Review the audit workspace and feedback record.` };
}

export function buildDraftReadyAlert(draftTitle: string): OwnerAlert {
  return { title: "Draft ready for human review", content: `Draft “${draftTitle}” is awaiting approval. No external action has been performed.` };
}
