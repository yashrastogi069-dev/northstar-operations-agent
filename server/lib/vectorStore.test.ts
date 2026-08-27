import { afterEach, describe, expect, it, vi } from "vitest";
import { searchConfiguredVectorStore, vectorStoreStatus } from "./vectorStore";

const initialUrl = process.env.QDRANT_URL;
const initialKey = process.env.QDRANT_API_KEY;

afterEach(() => {
  if (initialUrl === undefined) delete process.env.QDRANT_URL; else process.env.QDRANT_URL = initialUrl;
  if (initialKey === undefined) delete process.env.QDRANT_API_KEY; else process.env.QDRANT_API_KEY = initialKey;
  vi.unstubAllGlobals();
});

describe("optional Qdrant vector adapter", () => {
  it("stays dormant without explicitly configured credentials", async () => {
    delete process.env.QDRANT_URL;
    delete process.env.QDRANT_API_KEY;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(vectorStoreStatus().mode).toBe("safe_hybrid_fallback");
    await expect(searchConfiguredVectorStore({ collection: "firm-knowledge", vector: [0.1, 0.2], allowedSourceIds: [3] })).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends an approved-source filter to Qdrant and rejects any returned hit outside it", async () => {
    process.env.QDRANT_URL = "https://qdrant.example";
    process.env.QDRANT_API_KEY = "test-key";
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ result: { points: [
      { id: 1, score: 0.92, payload: { sourceId: 3, content: "Approved" } },
      { id: 2, score: 0.87, payload: { sourceId: 99, content: "Not authorized" } },
    ] } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const hits = await searchConfiguredVectorStore({ collection: "firm-knowledge", vector: [0.1, 0.2], allowedSourceIds: [3], limit: 50 });
    expect(hits).toEqual([{ id: "1", score: 0.92, payload: { sourceId: 3, content: "Approved" } }]);
    expect(String(fetchMock.mock.calls[0][0])).toContain("/collections/firm-knowledge/points/query");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ limit: 20, filter: { must: [{ key: "sourceId", match: { any: [3] } }] } });
  });

  it("requires a server-provided approved-source filter before an active-vector request", async () => {
    process.env.QDRANT_URL = "https://qdrant.example";
    process.env.QDRANT_API_KEY = "test-key";
    await expect(searchConfiguredVectorStore({ collection: "firm-knowledge", vector: [0.1], allowedSourceIds: [] })).rejects.toThrow("approved source filter");
  });
});
