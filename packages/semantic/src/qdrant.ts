import { QdrantClient } from '@qdrant/js-client-rest';

const COLLECTION = 'unionai-intents';
const VECTOR_SIZE = 384;

let client: QdrantClient | null = null;

export function getQdrantClient(): QdrantClient | null {
  if (!process.env.QDRANT_URL) return null;
  if (!client) {
    client = new QdrantClient({ url: process.env.QDRANT_URL });
  }
  return client;
}

export async function ensureCollection(): Promise<boolean> {
  const c = getQdrantClient();
  if (!c) return false;
  try {
    const existing = await c.getCollections();
    const names = existing.collections.map((col: any) => col.name);
    if (!names.includes(COLLECTION)) {
      await c.createCollection(COLLECTION, {
        vectors: { size: VECTOR_SIZE, distance: 'Cosine' }
      });
      console.log(`Qdrant: created collection ${COLLECTION}`);
    }
    return true;
  } catch (err) {
    console.warn('Qdrant collection init failed:', (err as Error).message);
    return false;
  }
}

export interface IntentPoint {
  id: string;
  vector: number[];
  payload: {
    intent_id: string;
    src_did: string;
    dst_did: string;
    intent: string;
    timestamp: string;
  };
}

export async function upsertIntent(point: IntentPoint): Promise<boolean> {
  const c = getQdrantClient();
  if (!c) return false;
  try {
    await c.upsert(COLLECTION, {
      wait: true,
      points: [{ id: point.id, vector: point.vector, payload: point.payload }]
    });
    return true;
  } catch (err) {
    console.warn('Qdrant upsert failed:', (err as Error).message);
    return false;
  }
}

export async function searchSimilarIntents(
  queryVector: number[],
  topK = 5
): Promise<Array<{ id: string; score: number; payload: any }>> {
  const c = getQdrantClient();
  if (!c) return [];
  try {
    const result = await c.search(COLLECTION, {
      vector: queryVector,
      limit: topK,
      with_payload: true
    });
    return result.map((r: any) => ({ id: String(r.id), score: r.score, payload: r.payload }));
  } catch (err) {
    console.warn('Qdrant search failed:', (err as Error).message);
    return [];
  }
}

/** Simple keyword-based pseudo-vector (fallback when no embedding model available) */
export function keywordVector(text: string): number[] {
  const words = text.toLowerCase().split(/\s+/);
  const vec = new Array(VECTOR_SIZE).fill(0);
  words.forEach((w, i) => {
    const idx = w.charCodeAt(0) % VECTOR_SIZE;
    vec[idx] += 1.0 / (i + 1);
  });
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map(v => v / norm);
}
