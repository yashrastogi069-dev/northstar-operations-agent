export type Embedding = number[];

export function isValidEmbedding(value: unknown): value is Embedding {
  return Array.isArray(value)
    && value.length > 0
    && value.length <= 16_384
    && value.every(item => typeof item === "number" && Number.isFinite(item));
}

export function cosineSimilarity(left: Embedding, right: Embedding): number {
  if (!isValidEmbedding(left) || !isValidEmbedding(right) || left.length !== right.length) return 0;
  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;
  for (let index = 0; index < left.length; index += 1) {
    const a = left[index];
    const b = right[index];
    dot += a * b;
    leftMagnitude += a * a;
    rightMagnitude += b * b;
  }
  if (leftMagnitude === 0 || rightMagnitude === 0) return 0;
  return Math.max(-1, Math.min(1, dot / Math.sqrt(leftMagnitude * rightMagnitude)));
}

export function parseEmbedding(value: unknown): Embedding | null {
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      return isValidEmbedding(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return isValidEmbedding(value) ? value : null;
}

export function normalizedSemanticScore(similarity: number): number {
  return Math.max(0, Math.min(1, (similarity + 1) / 2));
}
