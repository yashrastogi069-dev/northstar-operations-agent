/**
 * Optional Qdrant-compatible retrieval adapter.
 * It is intentionally dormant until an administrator configures a least-privilege
 * QDRANT_URL and QDRANT_API_KEY outside source control. Northstar's approved-source
 * hybrid retrieval remains the safe default when no vector service is configured.
 */
export type VectorSearchHit = { id: string; score: number; payload: Record<string, unknown> };

export function vectorStoreStatus() {
  return {
    provider: "qdrant-compatible",
    configured: Boolean(process.env.QDRANT_URL && process.env.QDRANT_API_KEY),
    mode: process.env.QDRANT_URL && process.env.QDRANT_API_KEY ? "ready_for_admin_activation" : "safe_hybrid_fallback",
  } as const;
}

export async function searchConfiguredVectorStore(): Promise<VectorSearchHit[]> {
  // Embeddings are intentionally not generated or sent to a third party until a firm
  // configures the vector service and approves its data-processing boundary.
  if (!vectorStoreStatus().configured) return [];
  return [];
}
