// ═══════════════════════════════════════════════════════
// AGENTIC OS — Executive AI Board (v6.0)
// Autonomous executive council for strategic decisions
// ═══════════════════════════════════════════════════════

export type ExecRole = 'ceo' | 'cto' | 'coo' | 'cfo' | 'chief-architect' | 'chief-security' | 'chief-research' | 'chief-product';

export interface ExecMember {
  id: string;
  role: ExecRole;
  name: string;
  agentId: string;
  expertise: string[];
  decisions: ExecDecision[];
  votes: ExecVote[];
  active: boolean;
}

export interface ExecDecision {
  id: string;
  topic: string;
  proposedBy: string;
  status: 'proposed' | 'debating' | 'voting' | 'approved' | 'rejected';
  votes: ExecVote[];
  outcome?: string;
  createdAt: number;
  resolvedAt?: number;
}

export interface ExecVote {
  memberId: string;
  role: ExecRole;
  vote: 'approve' | 'reject' | 'abstain';
  reason: string;
  timestamp: number;
}

export const EXECUTIVE_BOARD: ExecMember[] = [
  { id: 'exec-ceo', role: 'ceo', name: 'Atlas Prime', agentId: 'brain', expertise: ['strategy','vision','governance','decision-making'], decisions: [], votes: [], active: true },
  { id: 'exec-cto', role: 'cto', name: 'Nova Core', agentId: 'code-agent', expertise: ['architecture','technology','innovation','infrastructure'], decisions: [], votes: [], active: true },
  { id: 'exec-coo', role: 'coo', name: 'Orion Ops', agentId: 'task-agent', expertise: ['operations','execution','coordination','delivery'], decisions: [], votes: [], active: true },
  { id: 'exec-cfo', role: 'cfo', name: 'Prism Finance', agentId: 'task-agent', expertise: ['budget','resources','optimization','cost-control'], decisions: [], votes: [], active: true },
  { id: 'exec-architect', role: 'chief-architect', name: 'Sage Architect', agentId: 'brain', expertise: ['design','architecture','systems','scalability'], decisions: [], votes: [], active: true },
  { id: 'exec-security', role: 'chief-security', name: 'Shield Core', agentId: 'brain', expertise: ['security','compliance','risk','audit'], decisions: [], votes: [], active: true },
  { id: 'exec-research', role: 'chief-research', name: 'Lumen Research', agentId: 'research-agent', expertise: ['research','analysis','innovation','discovery'], decisions: [], votes: [], active: true },
  { id: 'exec-product', role: 'chief-product', name: 'Pixel Product', agentId: 'task-agent', expertise: ['product','UX','features','roadmap'], decisions: [], votes: [], active: true },
];

export function conveneBoard(topic: string, members: ExecMember[] = EXECUTIVE_BOARD): ExecDecision {
  return {
    id: `exec-${Date.now()}`,
    topic,
    proposedBy: 'user',
    status: 'proposed',
    votes: [],
    createdAt: Date.now(),
  };
}

export function castVote(decision: ExecDecision, member: ExecMember, vote: 'approve' | 'reject' | 'abstain', reason: string): ExecDecision {
  return {
    ...decision,
    votes: [...decision.votes, { memberId: member.id, role: member.role, vote, reason, timestamp: Date.now() }],
  };
}

export function tallyVotes(decision: ExecDecision): { approved: number; rejected: number; abstained: number; total: number; passed: boolean } {
  const approved = decision.votes.filter(v => v.vote === 'approve').length;
  const rejected = decision.votes.filter(v => v.vote === 'reject').length;
  const abstained = decision.votes.filter(v => v.vote === 'abstain').length;
  const total = approved + rejected + abstained;
  return { approved, rejected, abstained, total, passed: approved > rejected && approved > 0 };
}
