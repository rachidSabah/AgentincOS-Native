// ═══════════════════════════════════════════════════════
// AGENTIC OS — Memory Graph Enhancement
// Graph-based intelligence layer over flat memory storage
// ═══════════════════════════════════════════════════════

export interface MemoryNode {
  id: string;
  content: string;
  type: 'fact' | 'concept' | 'procedure' | 'preference' | 'decision' | 'observation' | 'episode';
  source: string;              // agent or system that created this
  importance: number;          // 0-1
  accessCount: number;
  lastAccessedAt: number;
  decayRate: number;           // how quickly this memory fades
  connections: MemoryEdge[];
  embedding?: number[];        // vector embedding for semantic search
  artifactLinks: string[];     // linked artifact IDs
  projectContext?: string;     // project-level scope
  workspaceId?: string;
  sessionId?: string;          // cross-session tracking
  createdAt: number;
}

export interface MemoryEdge {
  id: string;
  targetId: string;
  relationship: 'related-to' | 'causes' | 'depends-on' | 'contradicts' | 'supports' | 'derived-from' | 'part-of' | 'precedes';
  strength: number;            // 0-1
  createdAt: number;
}

export interface MemoryQuery {
  text?: string;
  type?: string;
  source?: string;
  workspaceId?: string;
  minImportance?: number;
  tags?: string[];
  limit?: number;
}

export interface MemorySearchResult {
  node: MemoryNode;
  score: number;
  matchReason: string;
}

// Memory graph operations
export class MemoryGraphEngine {
  private nodes: Map<string, MemoryNode> = new Map();
  
  addNode(node: MemoryNode): void {
    this.nodes.set(node.id, node);
  }
  
  getNode(id: string): MemoryNode | undefined {
    return this.nodes.get(id);
  }
  
  accessNode(id: string): MemoryNode | undefined {
    const node = this.nodes.get(id);
    if (node) {
      node.accessCount++;
      node.lastAccessedAt = Date.now();
    }
    return node;
  }
  
  addEdge(fromId: string, edge: MemoryEdge): void {
    const node = this.nodes.get(fromId);
    if (node) {
      node.connections.push(edge);
    }
  }
  
  search(query: MemoryQuery): MemorySearchResult[] {
    let results: MemorySearchResult[] = [];
    
    for (const node of this.nodes.values()) {
      let score = 0;
      let matchReason = '';
      
      // Text matching
      if (query.text && node.content.toLowerCase().includes(query.text.toLowerCase())) {
        score += 0.5;
        matchReason = 'Text match';
      }
      
      // Type filter
      if (query.type && node.type === query.type) {
        score += 0.2;
        matchReason = matchReason ? `${matchReason} + Type match` : 'Type match';
      }
      
      // Source filter
      if (query.source && node.source === query.source) {
        score += 0.1;
      }
      
      // Workspace filter
      if (query.workspaceId && node.workspaceId === query.workspaceId) {
        score += 0.15;
      }
      
      // Importance boost
      score += node.importance * 0.2;
      
      // Recency boost
      const ageMs = Date.now() - node.lastAccessedAt;
      const recencyBoost = Math.max(0, 1 - (ageMs / (7 * 24 * 60 * 60 * 1000))); // Fade over 7 days
      score += recencyBoost * 0.1;
      
      if (score > 0.1) {
        results.push({ node, score, matchReason });
      }
    }
    
    // Sort by score descending
    results.sort((a, b) => b.score - a.score);
    
    // Apply limit
    if (query.limit) {
      results = results.slice(0, query.limit);
    }
    
    return results;
  }
  
  getRelated(nodeId: string, depth: number = 1): MemoryNode[] {
    const visited = new Set<string>();
    const result: MemoryNode[] = [];
    
    const traverse = (id: string, currentDepth: number) => {
      if (visited.has(id) || currentDepth > depth) return;
      visited.add(id);
      
      const node = this.nodes.get(id);
      if (!node) return;
      
      for (const edge of node.connections) {
        const target = this.nodes.get(edge.targetId);
        if (target && !visited.has(target.id)) {
          result.push(target);
          traverse(target.id, currentDepth + 1);
        }
      }
    };
    
    traverse(nodeId, 0);
    return result;
  }
  
  getCrossSessionMemories(sessionId: string): MemoryNode[] {
    return Array.from(this.nodes.values())
      .filter(n => n.sessionId === sessionId);
  }
  
  getAgentSharedMemories(agentId: string): MemoryNode[] {
    return Array.from(this.nodes.values())
      .filter(n => n.source === agentId && n.connections.some(e => e.relationship === 'supports'));
  }
  
  getProjectMemories(projectContext: string): MemoryNode[] {
    return Array.from(this.nodes.values())
      .filter(n => n.projectContext === projectContext);
  }
}
