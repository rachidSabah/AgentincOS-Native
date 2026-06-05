// ============================================================
// Agentic OS V2 — RAG / Knowledge Engine
// ============================================================
import { memoryEngine } from './memory-engine';
import { db } from './db';

interface KnowledgeChunk {
  id: string;
  sourceId: string;
  content: string;
  index: number;
  tokenCount: number;
}

class KnowledgeEngine {
  async ingest(source: { name: string; content: string; type: string; workspaceId?: string }): Promise<{
    sourceId: string;
    chunkCount: number;
    totalTokens: number;
  }> {
    // Store the source as a knowledge memory
    const memory = await memoryEngine.store({
      type: 'knowledge',
      content: source.content,
      summary: `Source: ${source.name} (${source.type})`,
      importance: 0.7,
      metadata: { sourceName: source.name, sourceType: source.type, chunked: true },
      workspaceId: source.workspaceId,
    });

    // Chunk the content
    const chunks = this.chunk(source.content, 500);
    let totalTokens = 0;

    for (let i = 0; i < chunks.length; i++) {
      const tokenCount = Math.ceil(chunks[i].split(' ').length * 1.3);
      totalTokens += tokenCount;

      // Store each chunk as a separate memory
      await memoryEngine.store({
        type: 'knowledge',
        content: chunks[i],
        summary: `Chunk ${i + 1} of ${source.name}`,
        importance: 0.5,
        metadata: {
          sourceId: memory.id,
          sourceName: source.name,
          chunkIndex: i,
          tokenCount,
        },
        workspaceId: source.workspaceId,
      });
    }

    return {
      sourceId: memory.id,
      chunkCount: chunks.length,
      totalTokens,
    };
  }

  chunk(text: string, size: number = 500, overlap: number = 50): string[] {
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + size, text.length);
      const chunk = text.slice(start, end);
      chunks.push(chunk);
      start += size - overlap;
      if (start >= text.length) break;
    }

    return chunks;
  }

  async retrieve(query: string, topK: number = 5): Promise<KnowledgeChunk[]> {
    // Simple keyword-based retrieval (in production, use vector similarity)
    const keywords = query.toLowerCase().split(' ').filter((w) => w.length > 2);

    const memories = await db.memory.findMany({
      where: {
        type: 'knowledge',
        metadata: { contains: 'chunkIndex' },
      },
      take: 100,
    });

    // Score each memory by keyword overlap
    const scored = memories.map((m) => {
      const contentLower = m.content.toLowerCase();
      const matchCount = keywords.filter((kw) => contentLower.includes(kw)).length;
      return { memory: m, score: matchCount };
    });

    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, topK).map((s, i) => {
      const meta = s.memory.metadata ? JSON.parse(s.memory.metadata) : {};
      return {
        id: s.memory.id,
        sourceId: meta.sourceId ?? '',
        content: s.memory.content,
        index: i,
        tokenCount: meta.tokenCount ?? 0,
      };
    });
  }

  async listSources(workspaceId?: string): Promise<Array<{
    id: string;
    name: string;
    type: string;
    chunkCount: number;
    createdAt: Date;
  }>> {
    const where: Record<string, unknown> = {
      type: 'knowledge',
      metadata: { contains: 'chunked' },
    };
    if (workspaceId) where.workspaceId = workspaceId;

    const sources = await db.memory.findMany({ where, orderBy: { createdAt: 'desc' } });

    return sources.map((s) => {
      const meta = s.metadata ? JSON.parse(s.metadata) : {};
      return {
        id: s.id,
        name: meta.sourceName ?? 'Unknown',
        type: meta.sourceType ?? 'unknown',
        chunkCount: 0,
        createdAt: s.createdAt,
      };
    });
  }
}

export const knowledgeEngine = new KnowledgeEngine();
