export class EmbeddingService {
  generateEmbedding(text: string): number[] {
    const hash = text.split('').reduce((h, c) => ((h << 5) - h) + c.charCodeAt(0), 0);
    const embedding: number[] = [];
    for (let i = 0; i < 384; i++) embedding.push(Math.sin(hash + i) * 0.5 + 0.5);
    return embedding;
  }
  cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) { dotProduct += a[i] * b[i]; normA += a[i] * a[i]; normB += b[i] * b[i]; }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
