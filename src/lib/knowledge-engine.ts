// ============================================================
// Agentic OS V2 — RAG 2.0 Knowledge Engine
// ============================================================
import type {
  KnowledgeDocument,
  KnowledgeChunk,
  KnowledgeSearchResult,
  RAGResult,
} from './types';
import { modelRouter } from './model-router';
import { memoryEngine } from './memory-engine';

// ─── Utility helpers ───

function generateId(): string {
  return `kd_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function generateChunkId(): string {
  return `kc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Rough token estimate: ~4 characters per token for English text.
 */
function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

// ─── TF-IDF Engine ───

interface TFIDFIndex {
  // document frequency: how many chunks contain each term
  docFreq: Map<string, number>;
  // total number of indexed chunks
  totalDocs: number;
}

/**
 * Tokenize text into lowercase word tokens, filtering short tokens.
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

/**
 * Compute term frequency for a single document (chunk).
 * Returns a map of term → frequency count.
 */
function termFrequency(tokens: string[]): Map<string, number> {
  const freq = new Map<string, number>();
  for (const token of tokens) {
    freq.set(token, (freq.get(token) ?? 0) + 1);
  }
  return freq;
}

/**
 * Compute TF-IDF score for a query against a document.
 * tf(t, d) = count of t in d / total tokens in d
 * idf(t) = log(N / (1 + df(t)))
 * score = sum over query terms of (tf * idf)
 */
function tfidfScore(
  queryTokens: string[],
  docTokens: string[],
  index: TFIDFIndex,
): number {
  const tf = termFrequency(docTokens);
  const docLen = docTokens.length || 1;
  let score = 0;

  for (const term of queryTokens) {
    const termFreq = tf.get(term) ?? 0;
    if (termFreq === 0) continue;
    const tfVal = termFreq / docLen;
    const df = index.docFreq.get(term) ?? 0;
    const idfVal = Math.log((index.totalDocs + 1) / (1 + df));
    score += tfVal * idfVal;
  }

  return score;
}

// ─── Chunking Strategy ───

/**
 * Structural-aware chunking: splits on headings/sections when possible,
 * otherwise falls back to paragraph/sentence-based splitting.
 * Target chunk size ~500 tokens with ~50 token overlap.
 */
function chunkDocument(
  content: string,
  documentId: string,
  chunkSize: number = 500,
  overlap: number = 50,
): KnowledgeChunk[] {
  const chunks: KnowledgeChunk[] = [];

  // Try to split by markdown headings or section markers first
  const sectionRegex = /^(#{1,6}\s+.+|={3,}|-{3,}|\[.*\])/gm;
  const sections: Array<{ heading: string; text: string }> = [];

  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let currentHeading = '';

  // Check if content has structural markers
  if (sectionRegex.test(content)) {
    sectionRegex.lastIndex = 0;
    const indices: Array<{ index: number; heading: string }> = [];
    while ((match = sectionRegex.exec(content)) !== null) {
      indices.push({ index: match.index, heading: match[0].trim() });
    }

    if (indices.length > 0) {
      for (let i = 0; i < indices.length; i++) {
        const start = i === 0 ? 0 : indices[i].index;
        const end = i < indices.length - 1 ? indices[i + 1].index : content.length;
        const text = content.slice(start, end).trim();
        if (text) {
          sections.push({ heading: indices[i].heading, text });
        }
      }
    }
  }

  // If no structural sections found, treat entire content as one section
  if (sections.length === 0) {
    sections.push({ heading: '', text: content });
  }

  // Now split each section into chunks respecting token limits
  let chunkIndex = 0;

  for (const section of sections) {
    const sectionText = section.text;
    const sectionTokens = estimateTokenCount(sectionText);

    if (sectionTokens <= chunkSize * 1.2) {
      // Section fits in a single chunk
      if (sectionText.trim()) {
        chunks.push({
          id: generateChunkId(),
          documentId,
          content: sectionText.trim(),
          index: chunkIndex++,
          metadata: {
            heading: section.heading,
            sectionStart: true,
            sectionEnd: true,
          },
        });
      }
    } else {
      // Split section into multiple chunks with overlap
      // Work at the paragraph/sentence level for cleaner splits
      const paragraphs = splitIntoParagraphs(sectionText);
      let currentChunk = '';
      let currentTokenEstimate = 0;
      let chunkStartIndex = chunkIndex;

      for (const paragraph of paragraphs) {
        const paraTokens = estimateTokenCount(paragraph);

        if (currentTokenEstimate + paraTokens > chunkSize && currentChunk) {
          // Finalize current chunk
          chunks.push({
            id: generateChunkId(),
            documentId,
            content: currentChunk.trim(),
            index: chunkIndex++,
            metadata: {
              heading: section.heading,
              sectionStart: chunkIndex - 1 === chunkStartIndex,
              sectionEnd: false,
            },
          });

          // Overlap: keep last ~overlap tokens worth of text
          const overlapText = getOverlapText(currentChunk, overlap);
          currentChunk = overlapText + '\n\n' + paragraph;
          currentTokenEstimate = estimateTokenCount(currentChunk);
        } else {
          currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
          currentTokenEstimate += paraTokens;
        }
      }

      // Flush remaining
      if (currentChunk.trim()) {
        chunks.push({
          id: generateChunkId(),
          documentId,
          content: currentChunk.trim(),
          index: chunkIndex++,
          metadata: {
            heading: section.heading,
            sectionStart: chunkIndex - 1 === chunkStartIndex,
            sectionEnd: true,
          },
        });
      }
    }
  }

  return chunks;
}

/**
 * Split text into paragraphs (by double newlines or single newlines with blank lines).
 */
function splitIntoParagraphs(text: string): string[] {
  const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p.length > 0);
  if (paragraphs.length > 0) return paragraphs;

  // Fallback: split by single newlines
  const lines = text.split(/\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  if (lines.length > 0) return lines;

  // Fallback: split by sentences
  return text.split(/(?<=[.!?])\s+/).filter((s) => s.length > 0);
}

/**
 * Get the tail of text representing approximately `overlapTokens` tokens.
 */
function getOverlapText(text: string, overlapTokens: number): string {
  const charCount = overlapTokens * 4; // rough estimate
  if (text.length <= charCount) return text;
  const tail = text.slice(-charCount);
  // Try to start at a sentence or paragraph boundary
  const newlineIdx = tail.indexOf('\n');
  if (newlineIdx >= 0 && newlineIdx < tail.length * 0.5) {
    return tail.slice(newlineIdx + 1).trim();
  }
  return tail.trim();
}

// ─── Entity Extraction (simple NLP-style) ───

interface ExtractedEntity {
  name: string;
  type: 'person' | 'org' | 'concept' | 'technology' | 'location' | 'date' | 'other';
  mentions: number;
}

interface ExtractedRelation {
  source: string;
  target: string;
  relation: string;
  confidence: number;
}

/**
 * Simple entity extraction using pattern matching and heuristics.
 * In production, this would use NER models.
 */
function extractEntities(text: string): ExtractedEntity[] {
  const entityMap = new Map<string, ExtractedEntity>();

  // Capitalized multi-word phrases (potential named entities)
  const namedEntityRegex = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g;
  let match: RegExpExecArray | null;
  while ((match = namedEntityRegex.exec(text)) !== null) {
    const name = match[1];
    if (isCommonWord(name)) continue;
    const existing = entityMap.get(name);
    if (existing) {
      existing.mentions++;
    } else {
      entityMap.set(name, {
        name,
        type: classifyEntity(name),
        mentions: 1,
      });
    }
  }

  // Technology patterns (e.g., React, TypeScript, Node.js, Python, Docker)
  const techRegex = /\b([A-Z][a-zA-Z]*(?:\.js|\.ts|\.py)?|(?:node|docker|kubernetes|kafka|redis|postgres|mongo|react|angular|vue|svelte|next\.js|typescript|javascript|python|rust|golang|java|kotlin|swift))\b/gi;
  while ((match = techRegex.exec(text)) !== null) {
    const name = match[1];
    const key = name.toLowerCase();
    const existing = entityMap.get(key);
    if (existing) {
      existing.mentions++;
    } else {
      entityMap.set(key, {
        name: name,
        type: 'technology',
        mentions: 1,
      });
    }
  }

  // Quoted terms as concepts
  const conceptRegex = /"([^"]+)"/g;
  while ((match = conceptRegex.exec(text)) !== null) {
    const name = match[1];
    if (name.length < 3 || name.length > 80) continue;
    const existing = entityMap.get(name);
    if (existing) {
      existing.mentions++;
    } else {
      entityMap.set(name, {
        name,
        type: 'concept',
        mentions: 1,
      });
    }
  }

  return Array.from(entityMap.values()).filter((e) => e.mentions >= 1);
}

/**
 * Extract relationships between entities using pattern matching.
 */
function extractRelations(
  text: string,
  entities: ExtractedEntity[],
): ExtractedRelation[] {
  const relations: ExtractedRelation[] = [];
  const entityNames = entities.map((e) => e.name);

  // Pattern: "X is a Y", "X uses Y", "X depends on Y", "X implements Y"
  const relationPatterns = [
    { regex: /(\w[\w\s]*?)\s+is\s+(?:a|an|the)\s+(\w[\w\s]*?)(?:\.|,|;)/gi, type: 'is_a' },
    { regex: /(\w[\w\s]*?)\s+uses?\s+(\w[\w\s]*?)(?:\.|,|;|to)/gi, type: 'uses' },
    { regex: /(\w[\w\s]*?)\s+depends?\s+on\s+(\w[\w\s]*?)(?:\.|,|;)/gi, type: 'depends_on' },
    { regex: /(\w[\w\s]*?)\s+implements?\s+(\w[\w\s]*?)(?:\.|,|;)/gi, type: 'implements' },
    { regex: /(\w[\w\s]*?)\s+contains?\s+(\w[\w\s]*?)(?:\.|,|;)/gi, type: 'contains' },
    { regex: /(\w[\w\s]*?)\s+connects?\s+(?:to|with)\s+(\w[\w\s]*?)(?:\.|,|;)/gi, type: 'connects_to' },
  ];

  for (const pattern of relationPatterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.regex.exec(text)) !== null) {
      const source = match[1].trim();
      const target = match[2].trim();

      // Check if either source or target matches a known entity
      const sourceMatch = entityNames.find(
        (n) => n.toLowerCase() === source.toLowerCase() || source.toLowerCase().includes(n.toLowerCase()),
      );
      const targetMatch = entityNames.find(
        (n) => n.toLowerCase() === target.toLowerCase() || target.toLowerCase().includes(n.toLowerCase()),
      );

      if (sourceMatch || targetMatch) {
        relations.push({
          source: sourceMatch ?? source,
          target: targetMatch ?? target,
          relation: pattern.type,
          confidence: sourceMatch && targetMatch ? 0.9 : 0.5,
        });
      }
    }
  }

  return relations;
}

function isCommonWord(word: string): boolean {
  const common = new Set([
    'The', 'This', 'That', 'These', 'Those', 'There', 'Then', 'They',
    'Their', 'What', 'When', 'Where', 'Which', 'With', 'From', 'Into',
    'About', 'After', 'Before', 'Between', 'Through', 'During', 'Without',
    'However', 'Therefore', 'Moreover', 'Furthermore', 'Nevertheless',
    'Another', 'Other', 'Each', 'Every', 'Some', 'Many', 'Most',
    'First', 'Second', 'Third', 'Next', 'Last', 'Final',
  ]);
  return common.has(word);
}

function classifyEntity(name: string): ExtractedEntity['type'] {
  if (/\.js|\.ts|\.py|react|angular|vue/i.test(name)) return 'technology';
  if (/inc\.|corp\.|ltd\.|llc|company|organization/i.test(name)) return 'org';
  if (/city|country|state|street|avenue|road/i.test(name)) return 'location';
  return 'other';
}

// ─── Knowledge Engine ───

class KnowledgeEngine {
  // In-memory document store
  private documents: Map<string, KnowledgeDocument> = new Map();
  // In-memory chunk store (flattened, for fast search)
  private chunks: Map<string, KnowledgeChunk> = new Map();
  // TF-IDF index
  private tfidfIndex: TFIDFIndex = {
    docFreq: new Map(),
    totalDocs: 0,
  };
  // Tokenized chunk cache
  private chunkTokens: Map<string, string[]> = new Map();

  // ─── CRUD Operations ───

  /**
   * Ingest a document: extract text, generate summary, chunk, index.
   */
  async ingest(
    doc: Omit<KnowledgeDocument, 'id' | 'chunks' | 'createdAt' | 'updatedAt'>,
  ): Promise<KnowledgeDocument> {
    const id = generateId();
    const now = new Date();

    // Chunk the document content
    const chunks = chunkDocument(doc.content, id);

    // Generate AI summary
    let summary = doc.summary;
    if (!summary || summary.trim().length === 0) {
      try {
        const response = await modelRouter.executeWithFailover({
          prompt: `Summarize the following document in 2-3 concise sentences. Focus on the key topics and main points.\n\nDocument: ${doc.content.slice(0, 3000)}`,
          systemPrompt: 'You are a document summarization assistant. Provide concise, accurate summaries.',
          maxTokens: 256,
          temperature: 0.3,
        });
        summary = response.content?.trim() || `Document: ${doc.name}`;
      } catch {
        summary = `Document: ${doc.name} (${doc.type})`;
      }
    }

    const document: KnowledgeDocument = {
      id,
      name: doc.name,
      type: doc.type,
      content: doc.content,
      summary,
      chunks,
      metadata: doc.metadata,
      tags: [...doc.tags],
      source: doc.source,
      createdAt: now,
      updatedAt: now,
    };

    // Store in memory
    this.documents.set(id, document);

    // Store chunks and update TF-IDF index
    for (const chunk of chunks) {
      this.chunks.set(chunk.id, chunk);
      const tokens = tokenize(chunk.content);
      this.chunkTokens.set(chunk.id, tokens);

      // Update document frequency
      const uniqueTokens = new Set(tokens);
      for (const token of uniqueTokens) {
        this.tfidfIndex.docFreq.set(token, (this.tfidfIndex.docFreq.get(token) ?? 0) + 1);
      }
      this.tfidfIndex.totalDocs++;
    }

    // Persist to memory engine (DB)
    try {
      const memoryNode = await memoryEngine.store({
        type: 'knowledge',
        content: doc.content,
        summary,
        importance: 0.7,
        metadata: {
          documentId: id,
          documentName: doc.name,
          documentType: doc.type,
          chunkCount: chunks.length,
          tags: doc.tags,
          source: doc.source,
        },
      });

      // Store chunks as connected memories
      for (let i = 0; i < chunks.length; i++) {
        const chunkMemory = await memoryEngine.store({
          type: 'knowledge',
          content: chunks[i].content,
          summary: `Chunk ${i + 1} of ${doc.name}`,
          importance: 0.5,
          metadata: {
            documentId: id,
            chunkIndex: i,
            chunkId: chunks[i].id,
          },
        });

        // Connect chunk to parent document
        await memoryEngine.connect(memoryNode.id, chunkMemory.id, 'has_chunk', 0.8 - i * 0.01);
      }

      // Extract entities and store in knowledge graph
      await this.extractAndStoreEntities(document, memoryNode.id);
    } catch (error) {
      // Memory engine persistence failed — continue with in-memory only
      console.warn('[KnowledgeEngine] Memory persistence warning:', error);
    }

    return document;
  }

  /**
   * Get a document by ID.
   */
  async getDocument(id: string): Promise<KnowledgeDocument | null> {
    return this.documents.get(id) ?? null;
  }

  /**
   * List all documents.
   */
  async listDocuments(): Promise<KnowledgeDocument[]> {
    return Array.from(this.documents.values()).sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
    );
  }

  /**
   * Delete a document by ID.
   */
  async deleteDocument(id: string): Promise<void> {
    const doc = this.documents.get(id);
    if (!doc) return;

    // Remove chunks from index
    for (const chunk of doc.chunks) {
      this.chunks.delete(chunk.id);
      const tokens = this.chunkTokens.get(chunk.id);
      if (tokens) {
        const uniqueTokens = new Set(tokens);
        for (const token of uniqueTokens) {
          const df = this.tfidfIndex.docFreq.get(token) ?? 1;
          if (df <= 1) {
            this.tfidfIndex.docFreq.delete(token);
          } else {
            this.tfidfIndex.docFreq.set(token, df - 1);
          }
        }
        this.chunkTokens.delete(chunk.id);
      }
      this.tfidfIndex.totalDocs = Math.max(0, this.tfidfIndex.totalDocs - 1);
    }

    // Remove document
    this.documents.delete(id);
  }

  /**
   * Add tags to a document.
   */
  async addTags(documentId: string, tags: string[]): Promise<void> {
    const doc = this.documents.get(documentId);
    if (!doc) return;

    const existingTags = new Set(doc.tags);
    for (const tag of tags) {
      existingTags.add(tag);
    }
    doc.tags = Array.from(existingTags);
    doc.updatedAt = new Date();
  }

  // ─── Semantic Search ───

  /**
   * Search the knowledge base using TF-IDF scoring with position and recency boosts.
   */
  async search(
    query: string,
    options?: {
      topK?: number;
      sources?: string[];
      tags?: string[];
      minScore?: number;
    },
  ): Promise<KnowledgeSearchResult[]> {
    const topK = options?.topK ?? 5;
    const minScore = options?.minScore ?? 0.01;
    const sourceFilter = options?.sources;
    const tagFilter = options?.tags;

    const queryTokens = tokenize(query);
    if (queryTokens.length === 0) return [];

    const scored: Array<{ chunk: KnowledgeChunk; score: number; doc: KnowledgeDocument }> = [];

    for (const [chunkId, chunk] of this.chunks) {
      const doc = this.documents.get(chunk.documentId);
      if (!doc) continue;

      // Apply source type filter
      if (sourceFilter && sourceFilter.length > 0 && !sourceFilter.includes(doc.type)) {
        continue;
      }

      // Apply tag filter
      if (tagFilter && tagFilter.length > 0) {
        const hasTag = tagFilter.some((t) => doc.tags.includes(t));
        if (!hasTag) continue;
      }

      // TF-IDF score
      const docTokens = this.chunkTokens.get(chunkId) ?? tokenize(chunk.content);
      let score = tfidfScore(queryTokens, docTokens, this.tfidfIndex);

      // Position boost: earlier chunks get a slight boost
      const positionBoost = Math.max(0, 1 - chunk.index * 0.02);
      score *= 1 + positionBoost * 0.1;

      // Recency boost: newer documents get a slight boost
      const ageMs = Date.now() - doc.createdAt.getTime();
      const ageDays = ageMs / (1000 * 60 * 60 * 24);
      const recencyBoost = Math.max(0, 1 - ageDays * 0.01);
      score *= 1 + recencyBoost * 0.1;

      // Exact phrase match bonus
      const queryLower = query.toLowerCase();
      if (chunk.content.toLowerCase().includes(queryLower)) {
        score *= 1.5;
      }

      if (score >= minScore) {
        scored.push({ chunk, score, doc });
      }
    }

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, topK).map((s) => ({
      chunkId: s.chunk.id,
      documentId: s.chunk.documentId,
      documentName: s.doc.name,
      content: s.chunk.content,
      score: Math.round(s.score * 1000) / 1000,
      metadata: {
        ...s.chunk.metadata,
        documentType: s.doc.type,
        documentTags: s.doc.tags,
        chunkIndex: s.chunk.index,
      },
    }));
  }

  // ─── RAG Pipeline ───

  /**
   * RAG query: retrieve relevant chunks, assemble context, generate answer.
   */
  async ragQuery(
    query: string,
    options?: {
      topK?: number;
      sources?: string[];
      tags?: string[];
      minScore?: number;
    },
  ): Promise<RAGResult> {
    const topK = options?.topK ?? 5;

    // Step 1: Retrieve relevant chunks
    const searchResults = await this.search(query, {
      topK,
      sources: options?.sources,
      tags: options?.tags,
      minScore: options?.minScore,
    });

    const totalChunksSearched = this.chunks.size;

    // Step 2: Assemble context from chunks
    const context = searchResults
      .map(
        (r, i) =>
          `[Source ${i + 1}: ${r.documentName} (score: ${r.score})]\n${r.content}`,
      )
      .join('\n\n---\n\n');

    // Step 3: Generate answer using model router
    let answer: string;
    if (searchResults.length === 0) {
      answer = 'I could not find any relevant information in the knowledge base to answer your question. Try uploading more documents or rephrasing your query.';
    } else {
      try {
        const response = await modelRouter.executeWithFailover({
          prompt: `Based on the following context, answer the user's question. If the answer is not fully supported by the context, indicate what information is missing. Always cite which source(s) you used.

Context:
${context}

Question: ${query}`,
          systemPrompt:
            'You are a knowledgeable assistant that answers questions based strictly on the provided context. Always reference your sources. Be concise but thorough.',
          maxTokens: 1024,
          temperature: 0.3,
        });
        answer = response.content?.trim() || 'Unable to generate an answer. Please try again.';
      } catch {
        // Fallback: return context without AI synthesis
        answer = `Based on the retrieved context:\n\n${context}`;
      }
    }

    return {
      answer,
      sources: searchResults.map((r) => ({
        documentId: r.documentId,
        documentName: r.documentName,
        chunk: r.content,
        score: r.score,
      })),
      context,
      totalChunksSearched,
    };
  }

  // ─── Knowledge Graph ───

  /**
   * Extract entities and relationships from a document and store them in the memory graph.
   */
  private async extractAndStoreEntities(
    doc: KnowledgeDocument,
    memoryNodeId: string,
  ): Promise<void> {
    const entities = extractEntities(doc.content);
    const relations = extractRelations(doc.content, entities);

    // Store top entities as memory nodes and connect to document
    const entityNodeIdMap = new Map<string, string>();

    for (const entity of entities.slice(0, 20)) {
      // Limit to top 20 entities
      try {
        const entityNode = await memoryEngine.store({
          type: 'knowledge',
          content: entity.name,
          summary: `${entity.type}: ${entity.name} (mentioned ${entity.mentions}x in ${doc.name})`,
          importance: Math.min(0.9, 0.3 + entity.mentions * 0.1),
          metadata: {
            entityType: entity.type,
            mentions: entity.mentions,
            sourceDocument: doc.id,
          },
        });
        entityNodeIdMap.set(entity.name, entityNode.id);

        // Connect entity to document
        await memoryEngine.connect(memoryNodeId, entityNode.id, 'mentions', 0.6);
      } catch {
        // Continue even if individual entity storage fails
      }
    }

    // Store relationships as edges between entity nodes
    for (const relation of relations) {
      const sourceNodeId = entityNodeIdMap.get(relation.source);
      const targetNodeId = entityNodeIdMap.get(relation.target);

      if (sourceNodeId && targetNodeId) {
        try {
          await memoryEngine.connect(
            sourceNodeId,
            targetNodeId,
            relation.relation,
            relation.confidence,
          );
        } catch {
          // Continue even if individual relation storage fails
        }
      }
    }
  }

  /**
   * Query the knowledge graph: find entities related to a term.
   */
  async queryKnowledgeGraph(
    term: string,
    depth: number = 2,
  ): Promise<{
    nodes: Array<{ id: string; content: string; type: string }>;
    edges: Array<{ source: string; target: string; relation: string }>;
  }> {
    // Find entity nodes matching the term
    const matchingEntities: Array<{ id: string; name: string }> = [];

    for (const doc of this.documents.values()) {
      const entities = extractEntities(doc.content);
      for (const entity of entities) {
        if (
          entity.name.toLowerCase().includes(term.toLowerCase()) ||
          term.toLowerCase().includes(entity.name.toLowerCase())
        ) {
          matchingEntities.push({ id: entity.name, name: entity.name });
        }
      }
    }

    // For each matching entity, traverse the memory graph
    const allNodes: Array<{ id: string; content: string; type: string }> = [];
    const allEdges: Array<{ source: string; target: string; relation: string }> = [];
    const visitedNodes = new Set<string>();

    for (const entity of matchingEntities.slice(0, 5)) {
      try {
        // Search memory for this entity
        const memories = await memoryEngine.retrieve({
          type: 'knowledge',
          query: entity.name,
          limit: 5,
        });

        for (const memory of memories) {
          if (visitedNodes.has(memory.id)) continue;
          visitedNodes.add(memory.id);

          const meta = memory.metadata as Record<string, unknown> | undefined;
          allNodes.push({
            id: memory.id,
            content: memory.content,
            type: (meta?.entityType as string) ?? 'unknown',
          });

          // Traverse connections
          const graph = await memoryEngine.traverse(memory.id, depth);
          for (const node of graph.nodes) {
            if (visitedNodes.has(node.id)) continue;
            visitedNodes.add(node.id);
            const nodeMeta = node.metadata as Record<string, unknown> | undefined;
            allNodes.push({
              id: node.id,
              content: node.content,
              type: (nodeMeta?.entityType as string) ?? 'unknown',
            });
          }
          for (const edge of graph.edges) {
            allEdges.push({
              source: edge.sourceId,
              target: edge.targetId,
              relation: edge.relationType,
            });
          }
        }
      } catch {
        // Continue even if graph traversal fails
      }
    }

    return { nodes: allNodes, edges: allEdges };
  }

  // ─── Utility / Stats ───

  /**
   * Get statistics about the knowledge base.
   */
  getStats(): {
    documentCount: number;
    totalChunks: number;
    totalTokens: number;
    documentTypes: Record<string, number>;
    tagCloud: Record<string, number>;
  } {
    let totalTokens = 0;
    const documentTypes: Record<string, number> = {};
    const tagCloud: Record<string, number> = {};

    for (const doc of this.documents.values()) {
      totalTokens += estimateTokenCount(doc.content);
      documentTypes[doc.type] = (documentTypes[doc.type] ?? 0) + 1;
      for (const tag of doc.tags) {
        tagCloud[tag] = (tagCloud[tag] ?? 0) + 1;
      }
    }

    return {
      documentCount: this.documents.size,
      totalChunks: this.chunks.size,
      totalTokens,
      documentTypes,
      tagCloud,
    };
  }
}

export const knowledgeEngine = new KnowledgeEngine();
