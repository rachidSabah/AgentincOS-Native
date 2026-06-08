// ============================================================
// Agentic OS — Memory Optimization Engine
// ============================================================
// Provides shared memory pooling, context compression, session
// snapshotting, memory metrics, and artifact compression.
// ============================================================

import type {
  MemoryPoolEntry,
  CompressionResult,
  SessionSnapshot,
  MemoryMetrics as MemoryMetricsType,
} from './types';

// ─── Utility: Simple hash function (content-addressable) ───

function hashContent(content: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < content.length; i++) {
    const ch = content.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const combined = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  return combined.toString(36);
}

// ─── SharedMemoryPool ───

export class SharedMemoryPool {
  private pool = new Map<string, MemoryPoolEntry>();
  private lruOrder: string[] = [];
  private refCounts = new Map<string, Set<string>>(); // hash -> Set<ownerId>
  private maxPoolSizeBytes: number;
  private currentSizeBytes = 0;

  // Metrics tracking
  private hits = 0;
  private misses = 0;

  constructor(maxPoolSizeBytes = 100 * 1024 * 1024) {
    // default 100 MB
    this.maxPoolSizeBytes = maxPoolSizeBytes;
  }

  /** Store content in the pool. Returns the content hash. */
  set(content: string, ownerId: string, metadata?: Record<string, unknown>): string {
    const hash = hashContent(content);
    const contentSize = new TextEncoder().encode(content).byteLength;

    // If entry already exists, just add a reference
    if (this.pool.has(hash)) {
      const entry = this.pool.get(hash)!;
      entry.lastAccessedAt = Date.now();
      entry.accessCount++;

      // Add owner reference
      if (!this.refCounts.has(hash)) {
        this.refCounts.set(hash, new Set());
      }
      this.refCounts.get(hash)!.add(ownerId);

      // Move to end of LRU
      this.touchLRU(hash);

      return hash;
    }

    // Evict if needed
    while (this.currentSizeBytes + contentSize > this.maxPoolSizeBytes && this.lruOrder.length > 0) {
      this.evictLRU();
    }

    // Create new entry
    const entry: MemoryPoolEntry = {
      hash,
      content,
      sizeBytes: contentSize,
      referenceCount: 1,
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
      accessCount: 1,
      metadata: metadata ?? {},
    };

    this.pool.set(hash, entry);
    this.refCounts.set(hash, new Set([ownerId]));
    this.lruOrder.push(hash);
    this.currentSizeBytes += contentSize;

    return hash;
  }

  /** Retrieve content by hash. Returns undefined if not found. */
  get(hash: string, ownerId?: string): string | undefined {
    const entry = this.pool.get(hash);
    if (!entry) {
      this.misses++;
      return undefined;
    }

    this.hits++;
    entry.lastAccessedAt = Date.now();
    entry.accessCount++;

    // If ownerId provided, register as a reference
    if (ownerId) {
      if (!this.refCounts.has(hash)) {
        this.refCounts.set(hash, new Set());
      }
      this.refCounts.get(hash)!.add(ownerId);
      entry.referenceCount = this.refCounts.get(hash)!.size;
    }

    this.touchLRU(hash);
    return entry.content;
  }

  /** Remove an owner's reference to an entry. If no references remain, entry is eligible for GC. */
  delete(hash: string, ownerId: string): boolean {
    const refs = this.refCounts.get(hash);
    if (!refs) return false;

    refs.delete(ownerId);

    const entry = this.pool.get(hash);
    if (entry) {
      entry.referenceCount = refs.size;
    }

    // If no more references, the entry can be garbage collected
    if (refs.size === 0) {
      this.refCounts.delete(hash);
      // Don't remove immediately — let GC handle it, or remove on next eviction pass
    }

    return true;
  }

  /** Garbage collect all entries with zero references. Returns number of entries collected. */
  gc(): number {
    let collected = 0;
    const toDelete: string[] = [];

    for (const [hash, refs] of this.refCounts) {
      if (refs.size === 0) {
        toDelete.push(hash);
      }
    }

    for (const hash of toDelete) {
      const entry = this.pool.get(hash);
      if (entry) {
        this.currentSizeBytes -= entry.sizeBytes;
        this.pool.delete(hash);
        this.refCounts.delete(hash);
        const idx = this.lruOrder.indexOf(hash);
        if (idx !== -1) {
          this.lruOrder.splice(idx, 1);
        }
        collected++;
      }
    }

    return collected;
  }

  /** Check if a hash exists in the pool. */
  has(hash: string): boolean {
    return this.pool.has(hash);
  }

  /** Get the entry metadata without updating access stats. */
  peek(hash: string): MemoryPoolEntry | undefined {
    return this.pool.get(hash);
  }

  /** Get the current size of the pool in bytes. */
  get sizeBytes(): number {
    return this.currentSizeBytes;
  }

  /** Get the number of entries in the pool. */
  get entryCount(): number {
    return this.pool.size;
  }

  /** Get pool hit rate (0-1). */
  get hitRate(): number {
    const total = this.hits + this.misses;
    return total === 0 ? 0 : this.hits / total;
  }

  /** Get deduplication savings in bytes — total bytes that would have been stored without dedup. */
  get dedupSavingsBytes(): number {
    let totalSavings = 0;
    for (const [hash, refs] of this.refCounts) {
      const entry = this.pool.get(hash);
      if (entry && refs.size > 1) {
        // Each additional reference beyond the first is a saving
        totalSavings += entry.sizeBytes * (refs.size - 1);
      }
    }
    return totalSavings;
  }

  private touchLRU(hash: string): void {
    const idx = this.lruOrder.indexOf(hash);
    if (idx !== -1) {
      this.lruOrder.splice(idx, 1);
    }
    this.lruOrder.push(hash);
  }

  private evictLRU(): void {
    if (this.lruOrder.length === 0) return;

    // Find the first entry with only 0-1 references (prefer evicting unreferenced)
    let evictHash: string | null = null;
    for (const hash of this.lruOrder) {
      const refs = this.refCounts.get(hash);
      if (!refs || refs.size <= 1) {
        evictHash = hash;
        break;
      }
    }

    // If all have >1 references, evict the LRU one anyway
    if (evictHash === null) {
      evictHash = this.lruOrder[0];
    }

    const entry = this.pool.get(evictHash);
    if (entry) {
      this.currentSizeBytes -= entry.sizeBytes;
      this.pool.delete(evictHash);
      this.refCounts.delete(evictHash);
    }
    const idx = this.lruOrder.indexOf(evictHash);
    if (idx !== -1) {
      this.lruOrder.splice(idx, 1);
    }
  }
}

// ─── ContextCompression ───

export class ContextCompression {
  private compressionRatioSum = 0;
  private compressionCount = 0;
  private previousStates = new Map<string, string>(); // key -> previous compressed state

  /** Summary-based compression: reduce long text to key points. */
  summaryCompress(text: string, maxPoints = 5): CompressionResult {
    const originalSize = new TextEncoder().encode(text).byteLength;

    // Extract sentences
    const sentences = text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 10);

    // Score sentences by importance (heuristic: position + keyword density)
    const keywords = this.extractKeywords(text);
    const scored = sentences.map((sentence, idx) => {
      const positionScore = idx < 3 ? 2 : idx < sentences.length - 2 ? 1 : 1.5; // intro and conclusion bonus
      const keywordScore = keywords.reduce((acc, kw) => acc + (sentence.toLowerCase().includes(kw) ? 1 : 0), 0);
      const lengthScore = Math.min(sentence.length / 50, 2);
      return { sentence, score: positionScore + keywordScore + lengthScore };
    });

    scored.sort((a, b) => b.score - a.score);
    const topPoints = scored.slice(0, maxPoints).map(s => s.sentence);

    const compressed = topPoints.join('. ') + '.';
    const compressedSize = new TextEncoder().encode(compressed).byteLength;
    const ratio = originalSize === 0 ? 1 : compressedSize / originalSize;

    this.recordCompressionRatio(ratio);

    return {
      original: text,
      compressed,
      originalSizeBytes: originalSize,
      compressedSizeBytes: compressedSize,
      ratio,
      method: 'summary',
      metadata: { pointsExtracted: topPoints.length },
    };
  }

  /** Structural compression: remove redundant formatting/whitespace. */
  structuralCompress(text: string): CompressionResult {
    const originalSize = new TextEncoder().encode(text).byteLength;

    let compressed = text;
    // Collapse multiple blank lines
    compressed = compressed.replace(/\n{3,}/g, '\n\n');
    // Remove trailing whitespace from lines
    compressed = compressed.replace(/[ \t]+$/gm, '');
    // Collapse multiple spaces
    compressed = compressed.replace(/ {2,}/g, ' ');
    // Remove leading whitespace on empty lines
    compressed = compressed.replace(/^\s+$/gm, '');
    // Collapse redundant markdown headers (e.g., multiple # lines)
    compressed = compressed.replace(/^(#{1,6})\s+\1\s+/gm, '$1 ');
    // Remove duplicate consecutive lines
    const lines = compressed.split('\n');
    const dedupedLines: string[] = [];
    let prevLine = '';
    for (const line of lines) {
      if (line !== prevLine || line.trim() === '') {
        dedupedLines.push(line);
      }
      prevLine = line;
    }
    compressed = dedupedLines.join('\n');
    // Trim trailing newlines
    compressed = compressed.replace(/\n+$/, '');

    const compressedSize = new TextEncoder().encode(compressed).byteLength;
    const ratio = originalSize === 0 ? 1 : compressedSize / originalSize;

    this.recordCompressionRatio(ratio);

    return {
      original: text,
      compressed,
      originalSizeBytes: originalSize,
      compressedSizeBytes: compressedSize,
      ratio,
      method: 'structural',
      metadata: {},
    };
  }

  /** Delta compression: store only changes from the previous state. */
  deltaCompress(key: string, current: string): CompressionResult {
    const originalSize = new TextEncoder().encode(current).byteLength;
    const previous = this.previousStates.get(key);

    let compressed: string;
    let method: string;

    if (!previous) {
      // No previous state — store the full content as structural compressed
      const structResult = this.structuralCompress(current);
      compressed = structResult.compressed;
      method = 'delta_full';
    } else {
      // Compute a simple line-based diff
      const prevLines = previous.split('\n');
      const currLines = current.split('\n');

      const delta: string[] = [];
      const maxLen = Math.max(prevLines.length, currLines.length);

      for (let i = 0; i < maxLen; i++) {
        const pLine = i < prevLines.length ? prevLines[i] : undefined;
        const cLine = i < currLines.length ? currLines[i] : undefined;

        if (pLine === cLine) {
          // Unchanged — skip
          continue;
        } else if (pLine === undefined) {
          // Added line
          delta.push(`+${i}:${cLine}`);
        } else if (cLine === undefined) {
          // Removed line
          delta.push(`-${i}:${pLine}`);
        } else {
          // Modified line
          delta.push(`~${i}:${cLine}`);
        }
      }

      compressed = delta.join('\n');
      method = 'delta';

      // If delta is larger than structural compression, use structural instead
      const deltaSize = new TextEncoder().encode(compressed).byteLength;
      const structResult = this.structuralCompress(current);
      if (deltaSize > structResult.compressedSizeBytes) {
        compressed = structResult.compressed;
        method = 'delta_fallback_structural';
      }
    }

    // Update previous state
    this.previousStates.set(key, current);

    const compressedSize = new TextEncoder().encode(compressed).byteLength;
    const ratio = originalSize === 0 ? 1 : compressedSize / originalSize;

    this.recordCompressionRatio(ratio);

    return {
      original: current,
      compressed,
      originalSizeBytes: originalSize,
      compressedSizeBytes: compressedSize,
      ratio,
      method,
      metadata: { key, hadPreviousState: previous !== undefined },
    };
  }

  /** Apply a delta to reconstruct the full content. */
  deltaDecompress(key: string, delta: string): string {
    const previous = this.previousStates.get(key);
    if (!previous) return delta; // No base — return as-is

    const prevLines = previous.split('\n');
    const result = [...prevLines];
    const deltaLines = delta.split('\n');

    for (const dl of deltaLines) {
      const match = dl.match(/^([+~\-])(\d+):(.*)$/s);
      if (!match) continue;

      const [, op, idxStr, content] = match;
      const idx = parseInt(idxStr, 10);

      if (op === '+') {
        // Insert line at index
        result.splice(idx, 0, content);
      } else if (op === '~') {
        // Modify line at index
        if (idx < result.length) {
          result[idx] = content;
        }
      } else if (op === '-') {
        // Remove line at index
        if (idx < result.length) {
          result.splice(idx, 1);
        }
      }
    }

    return result.join('\n');
  }

  /** Get average compression ratio across all compressions. */
  get averageCompressionRatio(): number {
    return this.compressionCount === 0 ? 1 : this.compressionRatioSum / this.compressionCount;
  }

  /** Get total compression savings in bytes. */
  get totalCompressionSavingsBytes(): number {
    // This is tracked via metrics — approximate from average ratio
    return 0; // Caller should use MemoryMetrics for aggregate stats
  }

  private recordCompressionRatio(ratio: number): void {
    this.compressionRatioSum += ratio;
    this.compressionCount++;
  }

  private extractKeywords(text: string): string[] {
    const stopWords = new Set([
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
      'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
      'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
      'between', 'out', 'off', 'over', 'under', 'again', 'further', 'then',
      'once', 'and', 'but', 'or', 'nor', 'not', 'so', 'yet', 'both',
      'either', 'neither', 'each', 'every', 'all', 'any', 'few', 'more',
      'most', 'other', 'some', 'such', 'no', 'only', 'own', 'same', 'than',
      'too', 'very', 'just', 'because', 'if', 'when', 'where', 'how', 'what',
      'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'it', 'its',
    ]);

    const words = text.toLowerCase().split(/\W+/).filter(w => w.length > 3 && !stopWords.has(w));
    const freq = new Map<string, number>();
    for (const w of words) {
      freq.set(w, (freq.get(w) ?? 0) + 1);
    }

    return [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([w]) => w);
  }
}

// ─── SessionSnapshotting ───

export class SessionSnapshotting {
  private snapshots = new Map<string, SessionSnapshot>();
  private lastSnapshot: SessionSnapshot | null = null;
  private autoSnapshotEnabled = true;
  private importantEventCount = 0;
  private autoSnapshotInterval = 10; // Every N important events

  /** Capture a snapshot of the current system state. */
  snapshot(state: {
    kernelState?: Record<string, unknown>;
    activeAgents?: Array<{ id: string; type: string; status: string; task?: string }>;
    activeSwarms?: Array<{ id: string; task: string; status: string; agentIds: string[] }>;
    memoryGraph?: { nodes: unknown[]; edges: unknown[] };
  }): SessionSnapshot {
    const id = `snap_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = Date.now();

    // Check if we can do an incremental snapshot
    let isIncremental = false;
    let diffFromId: string | undefined;
    let diffData: Record<string, unknown> | undefined;

    if (this.lastSnapshot) {
      const diff = this.computeDiff(this.lastSnapshot.state, state);
      const diffSize = new TextEncoder().encode(JSON.stringify(diff)).byteLength;
      const fullSize = new TextEncoder().encode(JSON.stringify(state)).byteLength;

      // Use incremental if diff is significantly smaller
      if (diffSize < fullSize * 0.7) {
        isIncremental = true;
        diffFromId = this.lastSnapshot.id;
        diffData = diff;
      }
    }

    const snapshot: SessionSnapshot = {
      id,
      timestamp: now,
      state: isIncremental ? (diffData as Record<string, unknown>) : state,
      isIncremental,
      diffFromId,
      sizeBytes: new TextEncoder().encode(JSON.stringify(isIncremental ? diffData : state)).byteLength,
      metadata: {
        agentCount: state.activeAgents?.length ?? 0,
        swarmCount: state.activeSwarms?.length ?? 0,
        memoryNodeCount: state.memoryGraph?.nodes?.length ?? 0,
      },
    };

    this.snapshots.set(id, snapshot);
    this.lastSnapshot = snapshot;

    return snapshot;
  }

  /** Restore from a snapshot. Returns the full reconstructed state. */
  restore(snapshotId: string): Record<string, unknown> | null {
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot) return null;

    if (!snapshot.isIncremental) {
      return snapshot.state;
    }

    // Reconstruct by walking the diff chain
    const chain: SessionSnapshot[] = [];
    let current: SessionSnapshot | undefined = snapshot;

    while (current && current.isIncremental && current.diffFromId) {
      chain.push(current);
      current = this.snapshots.get(current.diffFromId);
    }

    if (!current) return null; // Broken chain

    // Start from the full snapshot and apply diffs in order (oldest first)
    chain.reverse();
    let result = { ...current.state };

    for (const snap of chain) {
      result = this.applyDiff(result, snap.state);
    }

    return result;
  }

  /** Record an important event and potentially auto-snapshot. */
  recordImportantEvent(
    event: string,
    state: Parameters<typeof this.snapshot>[0],
  ): SessionSnapshot | null {
    if (!this.autoSnapshotEnabled) return null;

    this.importantEventCount++;

    if (this.importantEventCount % this.autoSnapshotInterval === 0) {
      return this.snapshot(state);
    }

    return null;
  }

  /** Enable/disable auto-snapshotting. */
  setAutoSnapshot(enabled: boolean, interval?: number): void {
    this.autoSnapshotEnabled = enabled;
    if (interval !== undefined) {
      this.autoSnapshotInterval = interval;
    }
  }

  /** Get a snapshot by ID without restoring. */
  getSnapshot(id: string): SessionSnapshot | undefined {
    return this.snapshots.get(id);
  }

  /** List all snapshot IDs and timestamps. */
  listSnapshots(): Array<{ id: string; timestamp: number; isIncremental: boolean; sizeBytes: number }> {
    return [...this.snapshots.values()].map(s => ({
      id: s.id,
      timestamp: s.timestamp,
      isIncremental: s.isIncremental,
      sizeBytes: s.sizeBytes,
    }));
  }

  /** Delete a snapshot. */
  deleteSnapshot(id: string): boolean {
    return this.snapshots.delete(id);
  }

  /** Get total snapshot storage size. */
  get totalSizeBytes(): number {
    let total = 0;
    for (const snap of this.snapshots.values()) {
      total += snap.sizeBytes;
    }
    return total;
  }

  /** Get snapshot count. */
  get snapshotCount(): number {
    return this.snapshots.size;
  }

  private computeDiff(
    prev: Record<string, unknown>,
    current: Record<string, unknown>,
  ): Record<string, unknown> {
    const diff: Record<string, unknown> = {};

    for (const key of Object.keys(current)) {
      if (!(key in prev)) {
        diff[key] = { _op: 'add', value: current[key] };
      } else if (JSON.stringify(prev[key]) !== JSON.stringify(current[key])) {
        diff[key] = { _op: 'update', value: current[key] };
      }
    }

    for (const key of Object.keys(prev)) {
      if (!(key in current)) {
        diff[key] = { _op: 'remove' };
      }
    }

    return diff;
  }

  private applyDiff(
    base: Record<string, unknown>,
    diff: Record<string, unknown>,
  ): Record<string, unknown> {
    const result = { ...base };

    for (const [key, val] of Object.entries(diff)) {
      const op = (val as Record<string, unknown>)?._op;
      if (op === 'add' || op === 'update') {
        result[key] = (val as Record<string, unknown>).value;
      } else if (op === 'remove') {
        delete result[key];
      }
    }

    return result;
  }
}

// ─── MemoryMetrics ───

export class MemoryMetrics {
  private metrics: MemoryMetricsType = {
    totalBytesUsed: 0,
    peakBytesUsed: 0,
    deduplicationSavingsBytes: 0,
    compressionSavingsBytes: 0,
    poolHitRate: 0,
    poolMissRate: 0,
    poolEntryCount: 0,
    snapshotCount: 0,
    snapshotTotalBytes: 0,
    gcRunCount: 0,
    gcLastRunAt: null,
    gcEntriesCollected: 0,
    compressionCount: 0,
    averageCompressionRatio: 1,
  };

  /** Update metrics from a SharedMemoryPool instance. */
  updateFromPool(pool: SharedMemoryPool): void {
    this.metrics.totalBytesUsed = pool.sizeBytes;
    this.metrics.poolEntryCount = pool.entryCount;
    this.metrics.poolHitRate = pool.hitRate;
    this.metrics.poolMissRate = 1 - pool.hitRate;
    this.metrics.deduplicationSavingsBytes = pool.dedupSavingsBytes;

    if (pool.sizeBytes > this.metrics.peakBytesUsed) {
      this.metrics.peakBytesUsed = pool.sizeBytes;
    }
  }

  /** Update metrics from a ContextCompression instance. */
  updateFromCompression(compression: ContextCompression): void {
    this.metrics.averageCompressionRatio = compression.averageCompressionRatio;
    // Estimate savings: if ratio is 0.5, we save 50% on average
    const savingsRatio = 1 - compression.averageCompressionRatio;
    this.metrics.compressionSavingsBytes = Math.floor(this.metrics.totalBytesUsed * savingsRatio);
    this.metrics.compressionCount++;
  }

  /** Update metrics from a SessionSnapshotting instance. */
  updateFromSnapshots(snapshots: SessionSnapshotting): void {
    this.metrics.snapshotCount = snapshots.snapshotCount;
    this.metrics.snapshotTotalBytes = snapshots.totalSizeBytes;
  }

  /** Record a GC run. */
  recordGC(entriesCollected: number): void {
    this.metrics.gcRunCount++;
    this.metrics.gcLastRunAt = Date.now();
    this.metrics.gcEntriesCollected += entriesCollected;
  }

  /** Get a snapshot of current metrics. */
  getMetrics(): MemoryMetricsType {
    return { ...this.metrics };
  }

  /** Reset all metrics. */
  reset(): void {
    this.metrics = {
      totalBytesUsed: 0,
      peakBytesUsed: 0,
      deduplicationSavingsBytes: 0,
      compressionSavingsBytes: 0,
      poolHitRate: 0,
      poolMissRate: 0,
      poolEntryCount: 0,
      snapshotCount: 0,
      snapshotTotalBytes: 0,
      gcRunCount: 0,
      gcLastRunAt: null,
      gcEntriesCollected: 0,
      compressionCount: 0,
      averageCompressionRatio: 1,
    };
  }
}

// ─── ArtifactCompression ───

export class ArtifactCompression {
  private compressionResults = new Map<string, CompressionResult>();

  /** Compress a code artifact (remove whitespace, comments for storage). */
  compressCode(content: string, language?: string): CompressionResult {
    const originalSize = new TextEncoder().encode(content).byteLength;

    let compressed = content;

    // Remove single-line comments (// style)
    compressed = compressed.replace(/\/\/.*$/gm, '');
    // Remove multi-line comments (/* */ style)
    compressed = compressed.replace(/\/\*[\s\S]*?\*\//g, '');
    // Remove Python-style comments
    if (language === 'python' || language === 'py') {
      compressed = compressed.replace(/#.*$/gm, '');
    }
    // Remove HTML-style comments
    if (language === 'html' || language === 'xml') {
      compressed = compressed.replace(/<!--[\s\S]*?-->/g, '');
    }
    // Collapse multiple blank lines
    compressed = compressed.replace(/\n{2,}/g, '\n');
    // Remove trailing whitespace
    compressed = compressed.replace(/[ \t]+$/gm, '');
    // Remove leading whitespace on empty lines
    compressed = compressed.replace(/^\s+$/gm, '');

    const compressedSize = new TextEncoder().encode(compressed).byteLength;
    const ratio = originalSize === 0 ? 1 : compressedSize / originalSize;

    const result: CompressionResult = {
      original: content,
      compressed,
      originalSizeBytes: originalSize,
      compressedSizeBytes: compressedSize,
      ratio,
      method: 'code',
      metadata: { language: language ?? 'unknown' },
    };

    return result;
  }

  /** Compress a text/markdown artifact. */
  compressText(content: string): CompressionResult {
    const originalSize = new TextEncoder().encode(content).byteLength;

    let compressed = content;

    // Remove markdown image syntax but keep alt text
    compressed = compressed.replace(/!\[([^\]]*)\]\([^)]*\)/g, '[$1]');
    // Remove markdown link URLs but keep text
    compressed = compressed.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
    // Collapse multiple blank lines
    compressed = compressed.replace(/\n{3,}/g, '\n\n');
    // Remove trailing whitespace
    compressed = compressed.replace(/[ \t]+$/gm, '');
    // Collapse multiple spaces
    compressed = compressed.replace(/ {2,}/g, ' ');
    // Remove empty headers
    compressed = compressed.replace(/^#{1,6}\s*$/gm, '');

    const compressedSize = new TextEncoder().encode(compressed).byteLength;
    const ratio = originalSize === 0 ? 1 : compressedSize / originalSize;

    return {
      original: content,
      compressed,
      originalSizeBytes: originalSize,
      compressedSizeBytes: compressedSize,
      ratio,
      method: 'text',
      metadata: {},
    };
  }

  /** Store a compression result for later decompression. */
  storeCompressionResult(artifactId: string, result: CompressionResult): void {
    this.compressionResults.set(artifactId, result);
  }

  /** Decompress an artifact — returns the original content. */
  decompress(artifactId: string): string | null {
    const result = this.compressionResults.get(artifactId);
    if (!result) return null;
    return result.original;
  }

  /** Get the compression result for an artifact. */
  getCompressionResult(artifactId: string): CompressionResult | undefined {
    return this.compressionResults.get(artifactId);
  }

  /** Remove stored compression data for an artifact. */
  deleteCompressionResult(artifactId: string): boolean {
    return this.compressionResults.delete(artifactId);
  }

  /** Get total bytes saved by artifact compression. */
  get totalSavingsBytes(): number {
    let total = 0;
    for (const result of this.compressionResults.values()) {
      total += result.originalSizeBytes - result.compressedSizeBytes;
    }
    return total;
  }
}

// ─── MemoryOptimizer (Facade Singleton) ───

export class MemoryOptimizer {
  readonly pool: SharedMemoryPool;
  readonly compression: ContextCompression;
  readonly snapshots: SessionSnapshotting;
  readonly metrics: MemoryMetrics;
  readonly artifacts: ArtifactCompression;

  private gcIntervalId: ReturnType<typeof setInterval> | null = null;

  constructor(maxPoolSizeBytes = 100 * 1024 * 1024) {
    this.pool = new SharedMemoryPool(maxPoolSizeBytes);
    this.compression = new ContextCompression();
    this.snapshots = new SessionSnapshotting();
    this.metrics = new MemoryMetrics();
    this.artifacts = new ArtifactCompression();
  }

  /** Start automatic garbage collection at the given interval. */
  startAutoGC(intervalMs = 30_000): void {
    this.stopAutoGC();
    this.gcIntervalId = setInterval(() => {
      const collected = this.pool.gc();
      if (collected > 0) {
        this.metrics.recordGC(collected);
      }
      this.refreshMetrics();
    }, intervalMs);
  }

  /** Stop automatic garbage collection. */
  stopAutoGC(): void {
    if (this.gcIntervalId !== null) {
      clearInterval(this.gcIntervalId);
      this.gcIntervalId = null;
    }
  }

  /** Refresh all metrics from sub-components. */
  refreshMetrics(): void {
    this.metrics.updateFromPool(this.pool);
    this.metrics.updateFromSnapshots(this.snapshots);
  }

  /** Convenience: Store content in pool with optional compression. */
  store(
    content: string,
    ownerId: string,
    options?: {
      compress?: boolean;
      compressMethod?: 'summary' | 'structural' | 'delta';
      key?: string;
      metadata?: Record<string, unknown>;
    },
  ): { hash: string; compressionResult?: CompressionResult } {
    let finalContent = content;
    let compressionResult: CompressionResult | undefined;

    if (options?.compress) {
      const method = options.compressMethod ?? 'structural';
      switch (method) {
        case 'summary':
          compressionResult = this.compression.summaryCompress(content);
          break;
        case 'delta':
          compressionResult = this.compression.deltaCompress(options.key ?? ownerId, content);
          break;
        case 'structural':
        default:
          compressionResult = this.compression.structuralCompress(content);
          break;
      }
      finalContent = compressionResult.compressed;
      this.metrics.updateFromCompression(this.compression);
    }

    const hash = this.pool.set(finalContent, ownerId, options?.metadata);
    this.refreshMetrics();

    return { hash, compressionResult };
  }

  /** Convenience: Retrieve content from pool. */
  retrieve(hash: string, ownerId?: string): string | undefined {
    const result = this.pool.get(hash, ownerId);
    this.refreshMetrics();
    return result;
  }

  /** Convenience: Release a reference. */
  release(hash: string, ownerId: string): boolean {
    const result = this.pool.delete(hash, ownerId);
    this.refreshMetrics();
    return result;
  }

  /** Run garbage collection manually. */
  runGC(): number {
    const collected = this.pool.gc();
    this.metrics.recordGC(collected);
    this.refreshMetrics();
    return collected;
  }

  /** Take a system snapshot. */
  takeSnapshot(state: Parameters<typeof this.snapshots.snapshot>[0]): SessionSnapshot {
    const snap = this.snapshots.snapshot(state);
    this.refreshMetrics();
    return snap;
  }

  /** Restore from a snapshot. */
  restoreSnapshot(snapshotId: string): Record<string, unknown> | null {
    return this.snapshots.restore(snapshotId);
  }

  /** Get a full metrics report. */
  getMetricsReport(): MemoryMetricsType {
    this.refreshMetrics();
    return this.metrics.getMetrics();
  }

  /** Destroy the optimizer, cleaning up resources. */
  destroy(): void {
    this.stopAutoGC();
  }
}

// ─── Singleton Export ───

export const memoryOptimizer = new MemoryOptimizer();
