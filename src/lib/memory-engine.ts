// ============================================================
// Agentic OS V2 — Graph Memory Engine
// ============================================================
import type { MemoryType, MemoryNode, MemoryEdgeData, MemoryGraph } from './types';
import { db } from './db';

class MemoryEngine {
  async store(params: {
    type: MemoryType;
    content: string;
    summary?: string;
    importance?: number;
    metadata?: Record<string, unknown>;
    workspaceId?: string;
    expiresAt?: Date;
  }): Promise<MemoryNode> {
    const memory = await db.memory.create({
      data: {
        type: params.type,
        content: params.content,
        summary: params.summary ?? null,
        importance: params.importance ?? 0.5,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
        workspaceId: params.workspaceId ?? null,
        expiresAt: params.expiresAt ?? null,
      },
    });

    return {
      id: memory.id,
      type: memory.type as MemoryType,
      content: memory.content,
      summary: memory.summary ?? undefined,
      importance: memory.importance,
      metadata: memory.metadata ? JSON.parse(memory.metadata) : {},
      workspaceId: memory.workspaceId ?? undefined,
      expiresAt: memory.expiresAt ?? undefined,
      createdAt: memory.createdAt,
      edges: [],
    };
  }

  async retrieve(params: {
    type?: MemoryType;
    query?: string;
    workspaceId?: string;
    minImportance?: number;
    limit?: number;
  }): Promise<MemoryNode[]> {
    const where: Record<string, unknown> = {};
    if (params.type) where.type = params.type;
    if (params.workspaceId) where.workspaceId = params.workspaceId;
    if (params.minImportance !== undefined) where.importance = { gte: params.minImportance };

    const memories = await db.memory.findMany({
      where,
      orderBy: { importance: 'desc' },
      take: params.limit ?? 50,
    });

    return memories.map((m) => ({
      id: m.id,
      type: m.type as MemoryType,
      content: m.content,
      summary: m.summary ?? undefined,
      importance: m.importance,
      metadata: m.metadata ? JSON.parse(m.metadata) : {},
      workspaceId: m.workspaceId ?? undefined,
      expiresAt: m.expiresAt ?? undefined,
      createdAt: m.createdAt,
      edges: [],
    }));
  }

  async connect(sourceId: string, targetId: string, relationType: string, weight: number = 1.0): Promise<MemoryEdgeData> {
    const edge = await db.memoryEdge.create({
      data: {
        sourceMemoryId: sourceId,
        targetMemoryId: targetId,
        relationType,
        weight,
      },
    });

    return {
      id: edge.id,
      sourceId: edge.sourceMemoryId,
      targetId: edge.targetMemoryId,
      relationType: edge.relationType,
      weight: edge.weight,
    };
  }

  async traverse(startId: string, depth: number = 2): Promise<MemoryGraph> {
    const nodes: MemoryNode[] = [];
    const edges: MemoryEdgeData[] = [];
    const visited = new Set<string>();

    const collectNodes = async (id: string, currentDepth: number) => {
      if (currentDepth > depth || visited.has(id)) return;
      visited.add(id);

      const memory = await db.memory.findUnique({ where: { id } });
      if (!memory) return;

      nodes.push({
        id: memory.id,
        type: memory.type as MemoryType,
        content: memory.content,
        summary: memory.summary ?? undefined,
        importance: memory.importance,
        metadata: memory.metadata ? JSON.parse(memory.metadata) : {},
        workspaceId: memory.workspaceId ?? undefined,
        expiresAt: memory.expiresAt ?? undefined,
        createdAt: memory.createdAt,
        edges: [],
      });

      const sourceEdges = await db.memoryEdge.findMany({ where: { sourceMemoryId: id } });
      const targetEdges = await db.memoryEdge.findMany({ where: { targetMemoryId: id } });

      for (const edge of [...sourceEdges, ...targetEdges]) {
        edges.push({
          id: edge.id,
          sourceId: edge.sourceMemoryId,
          targetId: edge.targetMemoryId,
          relationType: edge.relationType,
          weight: edge.weight,
        });
        const nextId = edge.sourceMemoryId === id ? edge.targetMemoryId : edge.sourceMemoryId;
        await collectNodes(nextId, currentDepth + 1);
      }
    };

    await collectNodes(startId, 0);
    return { nodes, edges };
  }

  async decay(decayRate: number = 0.01): Promise<number> {
    const memories = await db.memory.findMany({
      where: { importance: { gt: 0 } },
      select: { id: true, importance: true },
    });

    let decayed = 0;
    for (const memory of memories) {
      const newImportance = Math.max(0, memory.importance - decayRate);
      await db.memory.update({
        where: { id: memory.id },
        data: { importance: newImportance },
      });
      decayed++;
    }

    return decayed;
  }

  async getGraph(workspaceId?: string): Promise<MemoryGraph> {
    const where: Record<string, unknown> = {};
    if (workspaceId) where.workspaceId = workspaceId;

    const memories = await db.memory.findMany({ where, take: 100 });
    const allEdges = await db.memoryEdge.findMany({ take: 500 });

    const nodes: MemoryNode[] = memories.map((m) => ({
      id: m.id,
      type: m.type as MemoryType,
      content: m.content,
      summary: m.summary ?? undefined,
      importance: m.importance,
      metadata: m.metadata ? JSON.parse(m.metadata) : {},
      workspaceId: m.workspaceId ?? undefined,
      expiresAt: m.expiresAt ?? undefined,
      createdAt: m.createdAt,
      edges: [],
    }));

    const nodeIds = new Set(nodes.map((n) => n.id));
    const edges: MemoryEdgeData[] = allEdges
      .filter((e) => nodeIds.has(e.sourceMemoryId) && nodeIds.has(e.targetMemoryId))
      .map((e) => ({
        id: e.id,
        sourceId: e.sourceMemoryId,
        targetId: e.targetMemoryId,
        relationType: e.relationType,
        weight: e.weight,
      }));

    return { nodes, edges };
  }
}

export const memoryEngine = new MemoryEngine();
