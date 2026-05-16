import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function embed(text: string): Promise<number[]> {
  const response = await client.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return response.data[0].embedding;
}

export class EmbeddingService {
  async generateEmbedding(text: string): Promise<number[]> {
    return embed(text);
  }
  cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) { dotProduct += a[i] * b[i]; normA += a[i] * a[i]; normB += b[i] * b[i]; }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
