import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// ============================================================
// Universal Memory Engine — API Route
// ============================================================
// Handles: list, create, get, update, delete, search, relate,
//          extract, timeline, graph
// ============================================================

// --- Type helpers ---

type MemoryType =
  | 'LONG_TERM'
  | 'SHORT_TERM'
  | 'EPISODIC'
  | 'SEMANTIC'
  | 'CONTEXT'
  | 'PROJECT'
  | 'USER'
  | 'TEAM'
  | 'CONVERSATION'

type ActionType =
  | 'list'
  | 'create'
  | 'get'
  | 'update'
  | 'delete'
  | 'search'
  | 'relate'
  | 'extract'
  | 'timeline'
  | 'graph'

interface CreateMemoryInput {
  type: MemoryType
  title: string
  content: string
  summary?: string
  source?: string
  sourceId?: string
  tags?: string[]
  concepts?: string[]
  confidence?: number
  importance?: number
  agentId?: string
  projectId?: string
  teamId?: string
  userId?: string
  metadata?: Record<string, unknown>
}

interface UpdateMemoryInput {
  id: string
  type?: MemoryType
  title?: string
  content?: string
  summary?: string
  importance?: number
  confidence?: number
  isActive?: boolean
  metadata?: Record<string, unknown>
  tags?: string[]
  concepts?: string[]
}

interface RelateInput {
  sourceId: string
  targetId: string
  relationType: string
  strength?: number
}

interface ExtractInput {
  sourceType: string
  sourceContent: string
  extractedType: string
  extractedContent: string
  confidence?: number
}

// --- Helper: build a safe Prisma where clause for listing ---

function buildListWhere(body: Record<string, unknown>) {
  const where: Record<string, unknown> = {}

  if (body.type) {
    where.type = body.type as string
  }
  if (body.projectId) {
    where.projectId = body.projectId as string
  }
  if (body.teamId) {
    where.teamId = body.teamId as string
  }
  if (body.userId) {
    where.userId = body.userId as string
  }
  if (body.isActive !== undefined) {
    where.isActive = body.isActive as boolean
  }

  if (body.search && typeof body.search === 'string' && body.search.trim()) {
    const q = body.search.trim()
    where.OR = [
      { title: { contains: q } },
      { content: { contains: q } },
      { summary: { contains: q } },
      { tags: { some: { tag: { name: { contains: q } } } } },
      { memoryConcepts: { some: { concept: { name: { contains: q } } } } },
    ]
  }

  return where
}

// --- Helper: ensure tags exist and return their records ---

async function ensureTags(tagNames: string[]): Promise<{ id: string; name: string }[]> {
  const results: { id: string; name: string }[] = []
  for (const name of tagNames) {
    const trimmed = name.trim()
    if (!trimmed) continue
    const tag = await db.tag.upsert({
      where: { name_category: { name: trimmed, category: null } },
      create: { name: trimmed },
      update: {},
    })
    results.push({ id: tag.id, name: tag.name })
  }
  return results
}

// --- Helper: ensure concepts exist and return their records ---

async function ensureConcepts(conceptNames: string[]): Promise<{ id: string; name: string }[]> {
  const results: { id: string; name: string }[] = []
  for (const name of conceptNames) {
    const trimmed = name.trim()
    if (!trimmed) continue
    const concept = await db.concept.upsert({
      where: { name: trimmed },
      create: { name: trimmed },
      update: {},
    })
    results.push({ id: concept.id, name: concept.name })
  }
  return results
}

// --- Helper: create a timeline event ---

async function createTimelineEvent(
  memoryId: string | null,
  eventType: string,
  description?: string,
  actorType?: string,
  actorId?: string,
  metadata?: Record<string, unknown>
) {
  return db.timelineEvent.create({
    data: {
      memoryId,
      eventType,
      description,
      actorType,
      actorId,
      metadata: metadata ? JSON.stringify(metadata) : undefined,
    },
  })
}

// ============================================================
// Action handlers
// ============================================================

async function handleList(body: Record<string, unknown>) {
  const limit = typeof body.limit === 'number' ? body.limit : 50
  const offset = typeof body.offset === 'number' ? body.offset : 0

  const where = buildListWhere(body)

  const [memories, total] = await Promise.all([
    db.memory.findMany({
      where,
      include: {
        tags: { include: { tag: true } },
        memoryConcepts: { include: { concept: true } },
        references: {
          include: { targetMemory: { select: { id: true, title: true, type: true } } },
        },
        referencedBy: {
          include: { sourceMemory: { select: { id: true, title: true, type: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    db.memory.count({ where }),
  ])

  return NextResponse.json({ memories, total, limit, offset })
}

async function handleCreate(body: CreateMemoryInput & Record<string, unknown>) {
  const {
    type,
    title,
    content,
    summary,
    source,
    sourceId,
    tags,
    concepts,
    confidence,
    importance,
    agentId,
    projectId,
    teamId,
    userId,
    metadata,
  } = body

  if (!type || !title || !content) {
    return NextResponse.json(
      { error: 'Missing required fields: type, title, content' },
      { status: 400 }
    )
  }

  // Ensure tags and concepts exist
  const tagRecords = tags && tags.length > 0 ? await ensureTags(tags) : []
  const conceptRecords = concepts && concepts.length > 0 ? await ensureConcepts(concepts) : []

  const memory = await db.memory.create({
    data: {
      type,
      title,
      content,
      summary,
      sourceType: source,
      sourceId,
      confidence: confidence ?? 1.0,
      importance: importance ?? 0.5,
      projectId: projectId ?? null,
      teamId: teamId ?? null,
      userId: userId ?? null,
      metadata: metadata ? JSON.stringify(metadata) : undefined,
      tags:
        tagRecords.length > 0
          ? {
              create: tagRecords.map((t) => ({
                tag: { connect: { id: t.id } },
              })),
            }
          : undefined,
      memoryConcepts:
        conceptRecords.length > 0
          ? {
              create: conceptRecords.map((c) => ({
                concept: { connect: { id: c.id } },
              })),
            }
          : undefined,
    },
    include: {
      tags: { include: { tag: true } },
      memoryConcepts: { include: { concept: true } },
    },
  })

  // Create timeline event
  await createTimelineEvent(
    memory.id,
    'MEMORY_CREATED',
    `Memory "${title}" created`,
    agentId ? 'agent' : 'user',
    agentId ?? userId,
    { memoryType: type }
  )

  return NextResponse.json({ memory }, { status: 201 })
}

async function handleGet(body: Record<string, unknown>) {
  const id = body.id as string
  if (!id) {
    return NextResponse.json({ error: 'Missing required field: id' }, { status: 400 })
  }

  const memory = await db.memory.findUnique({
    where: { id },
    include: {
      tags: { include: { tag: true } },
      memoryConcepts: { include: { concept: true } },
      references: {
        include: { targetMemory: { select: { id: true, title: true, type: true } } },
      },
      referencedBy: {
        include: { sourceMemory: { select: { id: true, title: true, type: true } } },
      },
      timelineEvents: { orderBy: { createdAt: 'desc' } },
      extractionResults: true,
      nodes: {
        include: {
          sourceRelations: { include: { targetNode: true } },
          targetRelations: { include: { sourceNode: true } },
        },
      },
      versions: { orderBy: { version: 'desc' } },
    },
  })

  if (!memory) {
    return NextResponse.json({ error: 'Memory not found' }, { status: 404 })
  }

  return NextResponse.json({ memory })
}

async function handleUpdate(body: UpdateMemoryInput & Record<string, unknown>) {
  const { id, tags, concepts, metadata, ...data } = body

  if (!id) {
    return NextResponse.json({ error: 'Missing required field: id' }, { status: 400 })
  }

  // Verify memory exists
  const existing = await db.memory.findUnique({ where: { id: id as string } })
  if (!existing) {
    return NextResponse.json({ error: 'Memory not found' }, { status: 404 })
  }

  // Build update payload — only include fields that are provided
  const updateData: Record<string, unknown> = {}
  const allowedFields = [
    'type',
    'title',
    'content',
    'summary',
    'importance',
    'confidence',
    'isActive',
  ] as const

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updateData[field] = data[field]
    }
  }

  if (metadata !== undefined) {
    updateData.metadata = JSON.stringify(metadata)
  }

  // Handle tags update: replace all tags
  if (tags && Array.isArray(tags)) {
    const tagRecords = await ensureTags(tags as string[])
    // Delete existing tag links and recreate
    await db.memoryTag.deleteMany({ where: { memoryId: id as string } })
    updateData.tags = {
      create: tagRecords.map((t) => ({
        tag: { connect: { id: t.id } },
      })),
    }
  }

  // Handle concepts update: replace all concepts
  if (concepts && Array.isArray(concepts)) {
    const conceptRecords = await ensureConcepts(concepts as string[])
    await db.memoryConcept.deleteMany({ where: { memoryId: id as string } })
    updateData.memoryConcepts = {
      create: conceptRecords.map((c) => ({
        concept: { connect: { id: c.id } },
      })),
    }
  }

  const memory = await db.memory.update({
    where: { id: id as string },
    data: updateData,
    include: {
      tags: { include: { tag: true } },
      memoryConcepts: { include: { concept: true } },
    },
  })

  // Create timeline event
  await createTimelineEvent(
    id as string,
    'MEMORY_UPDATED',
    `Memory "${existing.title}" updated`,
    'user',
    undefined,
    { updatedFields: Object.keys(updateData) }
  )

  return NextResponse.json({ memory })
}

async function handleDelete(body: Record<string, unknown>) {
  const id = body.id as string
  if (!id) {
    return NextResponse.json({ error: 'Missing required field: id' }, { status: 400 })
  }

  const existing = await db.memory.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'Memory not found' }, { status: 404 })
  }

  // Create timeline event BEFORE deletion (memoryId will be null after cascade)
  await createTimelineEvent(
    id,
    'MEMORY_DELETED',
    `Memory "${existing.title}" deleted`,
    'user',
    undefined,
    { memoryType: existing.type, title: existing.title }
  )

  // Cascade deletes will handle tags, concepts, relations, nodes, etc.
  await db.memory.delete({ where: { id } })

  return NextResponse.json({ success: true, id })
}

async function handleSearch(body: Record<string, unknown>) {
  const query = body.query as string
  if (!query || !query.trim()) {
    return NextResponse.json({ error: 'Missing required field: query' }, { status: 400 })
  }

  const q = query.trim()
  const limit = typeof body.limit === 'number' ? body.limit : 20

  // Search across multiple fields with scoring
  const [titleMatches, contentMatches, tagMatches, conceptMatches] = await Promise.all([
    db.memory.findMany({
      where: { title: { contains: q }, isActive: true },
      include: {
        tags: { include: { tag: true } },
        memoryConcepts: { include: { concept: true } },
      },
      take: limit,
    }),
    db.memory.findMany({
      where: { content: { contains: q }, isActive: true },
      include: {
        tags: { include: { tag: true } },
        memoryConcepts: { include: { concept: true } },
      },
      take: limit,
    }),
    db.memory.findMany({
      where: { tags: { some: { tag: { name: { contains: q } } } }, isActive: true },
      include: {
        tags: { include: { tag: true } },
        memoryConcepts: { include: { concept: true } },
      },
      take: limit,
    }),
    db.memory.findMany({
      where: {
        memoryConcepts: { some: { concept: { name: { contains: q } } } },
        isActive: true,
      },
      include: {
        tags: { include: { tag: true } },
        memoryConcepts: { include: { concept: true } },
      },
      take: limit,
    }),
  ])

  // Deduplicate and score results
  const seen = new Map<
    string,
    { memory: (typeof titleMatches)[number]; score: number; matchTypes: string[] }
  >()

  const addResults = (
    memories: typeof titleMatches,
    matchType: string,
    baseScore: number
  ) => {
    for (const memory of memories) {
      const existingEntry = seen.get(memory.id)
      if (existingEntry) {
        existingEntry.score += baseScore
        if (!existingEntry.matchTypes.includes(matchType)) {
          existingEntry.matchTypes.push(matchType)
        }
      } else {
        seen.set(memory.id, {
          memory,
          score: baseScore,
          matchTypes: [matchType],
        })
      }
    }
  }

  // Title matches score highest, then tags, concepts, then content
  addResults(titleMatches, 'title', 10)
  addResults(tagMatches, 'tag', 7)
  addResults(conceptMatches, 'concept', 5)
  addResults(contentMatches, 'content', 3)

  // Sort by score descending
  const results = Array.from(seen.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ memory, score, matchTypes }) => ({
      memory,
      score,
      matchTypes,
    }))

  return NextResponse.json({ results, query: q, total: results.length })
}

async function handleRelate(body: RelateInput & Record<string, unknown>) {
  const { sourceId, targetId, relationType, strength } = body

  if (!sourceId || !targetId || !relationType) {
    return NextResponse.json(
      { error: 'Missing required fields: sourceId, targetId, relationType' },
      { status: 400 }
    )
  }

  if (sourceId === targetId) {
    return NextResponse.json(
      { error: 'sourceId and targetId cannot be the same' },
      { status: 400 }
    )
  }

  // Verify both memories exist
  const [sourceMemory, targetMemory] = await Promise.all([
    db.memory.findUnique({ where: { id: sourceId as string } }),
    db.memory.findUnique({ where: { id: targetId as string } }),
  ])

  if (!sourceMemory) {
    return NextResponse.json({ error: 'Source memory not found' }, { status: 404 })
  }
  if (!targetMemory) {
    return NextResponse.json({ error: 'Target memory not found' }, { status: 404 })
  }

  try {
    const reference = await db.memoryReference.upsert({
      where: {
        sourceMemoryId_targetMemoryId_referenceType: {
          sourceMemoryId: sourceId as string,
          targetMemoryId: targetId as string,
          referenceType: relationType as string,
        },
      },
      create: {
        sourceMemoryId: sourceId as string,
        targetMemoryId: targetId as string,
        referenceType: relationType as string,
        confidence: strength ?? 1.0,
      },
      update: {
        confidence: strength ?? 1.0,
      },
    })

    // Create timeline event
    await createTimelineEvent(
      sourceId as string,
      'RELATIONSHIP_CREATED',
      `Relationship "${relationType as string}" created between memories`,
      'user',
      undefined,
      { sourceId, targetId, relationType }
    )

    return NextResponse.json({ reference }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create relationship'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

async function handleExtract(body: ExtractInput & Record<string, unknown>) {
  const { sourceType, sourceContent, extractedType, extractedContent, confidence } = body

  if (!sourceType || !extractedType || !extractedContent) {
    return NextResponse.json(
      { error: 'Missing required fields: sourceType, extractedType, extractedContent' },
      { status: 400 }
    )
  }

  try {
    // Create an extraction job
    const job = await db.extractionJob.create({
      data: {
        sourceType: sourceType as string,
        sourceId: (body.sourceId as string) ?? null,
        status: 'pending',
        metadata: JSON.stringify({ sourceContent: sourceContent ?? '' }),
      },
    })

    // Create the extraction result linked to the job
    const result = await db.extractionResult.create({
      data: {
        jobId: job.id,
        resultType: extractedType as string,
        content: extractedContent as string,
        confidence: confidence ?? 0.8,
        rawText: (sourceContent as string) ?? null,
        status: 'pending',
      },
    })

    return NextResponse.json({ job, result }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create extraction'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

async function handleTimeline(body: Record<string, unknown>) {
  const limit = typeof body.limit === 'number' ? body.limit : 50
  const offset = typeof body.offset === 'number' ? body.offset : 0

  const where: Record<string, unknown> = {}

  if (body.memoryId) {
    where.memoryId = body.memoryId as string
  }
  if (body.agentId) {
    where.actorType = 'agent'
    where.actorId = body.agentId as string
  }
  if (body.eventType) {
    where.eventType = body.eventType as string
  }

  const [events, total] = await Promise.all([
    db.timelineEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        memory: { select: { id: true, title: true, type: true } },
      },
    }),
    db.timelineEvent.count({ where }),
  ])

  return NextResponse.json({ events, total, limit, offset })
}

async function handleGraph() {
  const [nodes, relationships] = await Promise.all([
    db.memoryNode.findMany({
      include: {
        memory: { select: { id: true, title: true, type: true } },
      },
    }),
    db.memoryRelationship.findMany({
      include: {
        sourceNode: { select: { id: true, label: true, nodeType: true } },
        targetNode: { select: { id: true, label: true, nodeType: true } },
      },
    }),
  ])

  // Format for graph visualization
  const graphNodes = nodes.map((node) => ({
    id: node.id,
    label: node.label,
    type: node.nodeType,
    weight: node.weight,
    properties: node.properties ? JSON.parse(node.properties) : null,
    memory: node.memory,
  }))

  const graphEdges = relationships.map((rel) => ({
    id: rel.id,
    source: rel.sourceNodeId,
    target: rel.targetNodeId,
    relationType: rel.relationType,
    weight: rel.weight,
    confidence: rel.confidence,
    sourceNode: rel.sourceNode,
    targetNode: rel.targetNode,
  }))

  return NextResponse.json({
    nodes: graphNodes,
    edges: graphEdges,
    stats: {
      nodeCount: graphNodes.length,
      edgeCount: graphEdges.length,
    },
  })
}

// ============================================================
// Main POST handler
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const body: Record<string, unknown> = await request.json()
    const action = body.action as ActionType

    if (!action) {
      return NextResponse.json(
        { error: 'Missing required field: action' },
        { status: 400 }
      )
    }

    switch (action) {
      case 'list':
        return await handleList(body)

      case 'create':
        return await handleCreate(body as CreateMemoryInput & Record<string, unknown>)

      case 'get':
        return await handleGet(body)

      case 'update':
        return await handleUpdate(body as UpdateMemoryInput & Record<string, unknown>)

      case 'delete':
        return await handleDelete(body)

      case 'search':
        return await handleSearch(body)

      case 'relate':
        return await handleRelate(body as RelateInput & Record<string, unknown>)

      case 'extract':
        return await handleExtract(body as ExtractInput & Record<string, unknown>)

      case 'timeline':
        return await handleTimeline(body)

      case 'graph':
        return await handleGraph()

      default:
        return NextResponse.json(
          {
            error: `Unknown action: ${action}. Valid actions: list, create, get, update, delete, search, relate, extract, timeline, graph`,
          },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('[Memory Engine API] Error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ============================================================
// GET handler — convenience for read-only queries
// ============================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') as ActionType | null

    if (!action) {
      return NextResponse.json(
        {
          error: 'Missing required parameter: action',
          validActions: ['list', 'get', 'search', 'timeline', 'graph'],
        },
        { status: 400 }
      )
    }

    // Only allow read-only actions via GET
    const readOnlyActions: ActionType[] = ['list', 'get', 'search', 'timeline', 'graph']
    if (!readOnlyActions.includes(action)) {
      return NextResponse.json(
        { error: `Action "${action}" is not allowed via GET. Use POST instead.` },
        { status: 405 }
      )
    }

    // Build body from query params
    const body: Record<string, unknown> = { action }
    const intParams = ['limit', 'offset']
    const floatParams = ['confidence', 'importance']

    for (const [key, value] of searchParams.entries()) {
      if (key === 'action') continue
      if (intParams.includes(key)) {
        body[key] = parseInt(value, 10)
      } else if (floatParams.includes(key)) {
        body[key] = parseFloat(value)
      } else if (value === 'true' || value === 'false') {
        body[key] = value === 'true'
      } else {
        body[key] = value
      }
    }

    switch (action) {
      case 'list':
        return await handleList(body)

      case 'get':
        return await handleGet(body)

      case 'search':
        return await handleSearch(body)

      case 'timeline':
        return await handleTimeline(body)

      case 'graph':
        return await handleGraph()

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }
  } catch (error) {
    console.error('[Memory Engine API] GET Error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
