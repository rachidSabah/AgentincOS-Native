// ============================================================
// Agentic OS V2 — Artifact Engine
// ============================================================
import type { ArtifactType, ArtifactData } from './types';
import { db } from './db';

class ArtifactEngine {
  async create(params: {
    name: string;
    type: ArtifactType;
    content: string;
    language?: string;
    workspaceId: string;
    conversationId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<ArtifactData> {
    const artifact = await db.artifact.create({
      data: {
        name: params.name,
        type: params.type,
        content: params.content,
        language: params.language ?? null,
        workspaceId: params.workspaceId,
        conversationId: params.conversationId ?? null,
        version: 1,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      },
    });

    return this.toArtifactData(artifact);
  }

  async update(id: string, content: string): Promise<ArtifactData> {
    const existing = await db.artifact.findUnique({ where: { id } });
    if (!existing) throw new Error(`Artifact not found: ${id}`);

    const artifact = await db.artifact.update({
      where: { id },
      data: {
        content,
        version: existing.version + 1,
      },
    });

    return this.toArtifactData(artifact);
  }

  async getVersion(id: string, version: number): Promise<ArtifactData | null> {
    // In this lightweight implementation, we only keep the latest version
    const artifact = await db.artifact.findUnique({ where: { id } });
    if (!artifact || artifact.version !== version) return null;
    return this.toArtifactData(artifact);
  }

  async list(params: { workspaceId?: string; type?: ArtifactType }): Promise<ArtifactData[]> {
    const where: Record<string, unknown> = {};
    if (params.workspaceId) where.workspaceId = params.workspaceId;
    if (params.type) where.type = params.type;

    const artifacts = await db.artifact.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });

    return artifacts.map((a) => this.toArtifactData(a));
  }

  async preview(id: string): Promise<{
    artifact: ArtifactData;
    previewContent: string;
    language?: string;
  }> {
    const artifact = await db.artifact.findUnique({ where: { id } });
    if (!artifact) throw new Error(`Artifact not found: ${id}`);

    const data = this.toArtifactData(artifact);
    let previewContent = artifact.content;
    let language = artifact.language ?? undefined;

    // Generate preview based on type
    switch (artifact.type) {
      case 'code':
        previewContent = artifact.content;
        break;
      case 'markdown':
        previewContent = artifact.content;
        break;
      case 'json':
        try {
          previewContent = JSON.stringify(JSON.parse(artifact.content), null, 2);
          language = 'json';
        } catch {
          previewContent = artifact.content;
        }
        break;
      case 'yaml':
        previewContent = artifact.content;
        language = 'yaml';
        break;
      default:
        previewContent = artifact.content.slice(0, 5000);
    }

    return { artifact: data, previewContent, language };
  }

  private toArtifactData(a: {
    id: string;
    name: string;
    type: string;
    content: string;
    language: string | null;
    workspaceId: string;
    conversationId: string | null;
    version: number;
    metadata: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): ArtifactData {
    return {
      id: a.id,
      name: a.name,
      type: a.type as ArtifactType,
      content: a.content,
      language: a.language ?? undefined,
      workspaceId: a.workspaceId,
      conversationId: a.conversationId ?? undefined,
      version: a.version,
      metadata: a.metadata ? JSON.parse(a.metadata) : {},
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    };
  }
}

export const artifactEngine = new ArtifactEngine();
