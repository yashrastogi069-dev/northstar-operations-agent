/**
 * Optional Qdrant-compatible retrieval adapter. It accepts embeddings from a separately
 * approved provider; Northstar never silently transmits firm text to create embeddings.
 * The caller must pass server-authorized source IDs, which are applied both to Qdrant's
 * metadata filter and to the returned payload as defence in depth.
 */
export type VectorSearchHit = { id: string; score: number; payload: Record<string, unknown> };

export type VectorSearchInput = {
  collection: string;
  vector: number[];
  allowedSourceIds: number[];
  limit?: number;
};

export function vectorStoreStatus() {
  return {
    provider: "qdrant-compatible",
    configured: Boolean(process.env.QDRANT_URL && process.env.QDRANT_API_KEY),
    mode: process.env.QDRANT_URL && process.env.QDRANT_API_KEY ? "ready_for_admin_activation" : "safe_hybrid_fallback",
  } as const;
}

function validateInput(input: VectorSearchInput) {
  if (!/^[a-zA-Z0-9_-]{1,96}$/.test(input.collection)) throw new Error("Vector collection name is invalid.");
  if (!input.allowedSourceIds.length || input.allowedSourceIds.length > 500 || input.allowedSourceIds.some(id => !Number.isSafeInteger(id) || id <= 0)) throw new Error("An approved source filter is required for vector retrieval.");
  if (!input.vector.length || input.vector.length > 4_096 || input.vector.some(value => !Number.isFinite(value))) throw new Error("Embedding vector is invalid.");
}

export async function searchConfiguredVectorStore(input: VectorSearchInput): Promise<VectorSearchHit[]> {
  if (!vectorStoreStatus().configured) return [];
  validateInput(input);
  const base = new URL(process.env.QDRANT_URL!);
  if (base.protocol !== "https:") throw new Error("Qdrant must use HTTPS outside an explicitly managed local deployment.");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7_500);
  try {
    const response = await fetch(new URL(`/collections/${encodeURIComponent(input.collection)}/points/query`, base), {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": process.env.QDRANT_API_KEY! },
      signal: controller.signal,
      body: JSON.stringify({
        query: input.vector,
        limit: Math.min(Math.max(input.limit ?? 8, 1), 20),
        with_payload: true,
        with_vector: false,
        filter: { must: [{ key: "sourceId", match: { any: input.allowedSourceIds } }] },
      }),
    });
    if (!response.ok) throw new Error(`Qdrant query failed with status ${response.status}.`);
    const body = await response.json() as { result?: { points?: Array<{ id?: string | number; score?: number; payload?: unknown }> } };
    const permitted = new Set(input.allowedSourceIds);
    return (body.result?.points ?? [])
      .filter(point => typeof point.id === "string" || typeof point.id === "number")
      .filter(point => typeof point.score === "number" && Number.isFinite(point.score))
      .filter(point => point.payload && typeof point.payload === "object" && !Array.isArray(point.payload))
      .map(point => ({ id: String(point.id), score: point.score!, payload: point.payload as Record<string, unknown> }))
      .filter(hit => permitted.has(Number(hit.payload.sourceId)))
      .slice(0, 20);
  } finally {
    clearTimeout(timeout);
  }
}
