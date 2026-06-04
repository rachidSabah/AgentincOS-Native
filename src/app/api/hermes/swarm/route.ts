import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SwarmStrategy = "consensus" | "majority" | "delegation" | "race";
type SwarmStatus = "forming" | "deliberating" | "executing" | "completed" | "dissolved";
type VoteChoice = "approve" | "reject" | "abstain";

interface SwarmVote {
  agentId: string;
  proposalId: string;
  vote: VoteChoice;
  reasoning: string;
  timestamp: number;
}

interface SwarmProposal {
  id: string;
  swarmId: string;
  agentId: string;
  proposal: string;
  confidence: number;
  votes: SwarmVote[];
  createdAt: number;
}

interface SwarmSession {
  id: string;
  task: string;
  agents: string[];
  strategy: SwarmStrategy;
  maxRounds: number;
  currentRound: number;
  status: SwarmStatus;
  proposals: SwarmProposal[];
  winningProposalId: string | null;
  consensusPercentage: number;
  createdAt: number;
  dissolvedAt: number | null;
  completedAt: number | null;
}

// ---------------------------------------------------------------------------
// Action request types
// ---------------------------------------------------------------------------

interface CreateSwarmRequest {
  action: "create-swarm";
  task: string;
  agents: string[];
  strategy: SwarmStrategy;
  maxRounds?: number;
}

interface ProposeRequest {
  action: "propose";
  swarmId: string;
  agentId: string;
  proposal: string;
  confidence: number;
}

interface VoteRequest {
  action: "vote";
  swarmId: string;
  agentId: string;
  proposalId: string;
  vote: VoteChoice;
  reasoning: string;
}

interface ExecuteRequest {
  action: "execute";
  swarmId: string;
}

interface DissolveRequest {
  action: "dissolve";
  swarmId: string;
}

type SwarmActionRequest =
  | CreateSwarmRequest
  | ProposeRequest
  | VoteRequest
  | ExecuteRequest
  | DissolveRequest;

// ---------------------------------------------------------------------------
// In-memory store
// ---------------------------------------------------------------------------

const swarms = new Map<string, SwarmSession>();
const swarmHistory: SwarmSession[] = [];
const MAX_HISTORY = 100;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateSwarmId(): string {
  return `swarm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function generateProposalId(): string {
  return `prop-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Persist a completed/dissolved swarm into history. */
function archiveSwarm(swarm: SwarmSession): void {
  swarmHistory.push({ ...swarm });
  if (swarmHistory.length > MAX_HISTORY) {
    swarmHistory.splice(0, swarmHistory.length - MAX_HISTORY);
  }
}

// ---------------------------------------------------------------------------
// Consensus algorithm
// ---------------------------------------------------------------------------

/**
 * Evaluate whether a proposal has reached consensus.
 *
 * - "consensus": >60% approve AND average confidence of approvers > 0.7
 * - "majority": >50% approve (confidence threshold 0.5)
 * - "delegation": the delegated agent approves (first agent in agents list)
 * - "race": first proposal with ANY approval wins immediately
 */
function evaluateConsensus(swarm: SwarmSession): {
  reached: boolean;
  winnerId: string | null;
  consensusPercentage: number;
} {
  const agentCount = swarm.agents.length;
  if (agentCount === 0) return { reached: false, winnerId: null, consensusPercentage: 0 };

  let bestProposalId: string | null = null;
  let bestApprovalRate = 0;

  for (const proposal of swarm.proposals) {
    const votes = proposal.votes;
    const approvals = votes.filter((v) => v.vote === "approve");
    const approvalRate = approvals.length / agentCount;
    const avgConfidence =
      approvals.length > 0
        ? approvals.reduce((sum, v) => {
            // Look up the confidence from the proposal that this agent made
            const agentProposal = swarm.proposals.find((p) => p.agentId === v.agentId);
            return sum + (agentProposal?.confidence ?? 0.5);
          }, 0) / approvals.length
        : 0;

    switch (swarm.strategy) {
      case "consensus": {
        if (approvalRate > 0.6 && avgConfidence > 0.7) {
          if (approvalRate > bestApprovalRate) {
            bestApprovalRate = approvalRate;
            bestProposalId = proposal.id;
          }
        }
        break;
      }
      case "majority": {
        if (approvalRate > 0.5 && avgConfidence > 0.5) {
          if (approvalRate > bestApprovalRate) {
            bestApprovalRate = approvalRate;
            bestProposalId = proposal.id;
          }
        }
        break;
      }
      case "delegation": {
        const delegatedAgent = swarm.agents[0];
        const delegationVote = votes.find((v) => v.agentId === delegatedAgent && v.vote === "approve");
        if (delegationVote) {
          return {
            reached: true,
            winnerId: proposal.id,
            consensusPercentage: (approvals.length / agentCount) * 100,
          };
        }
        break;
      }
      case "race": {
        // First proposal with any approval wins
        if (approvals.length > 0) {
          return {
            reached: true,
            winnerId: proposal.id,
            consensusPercentage: (approvals.length / agentCount) * 100,
          };
        }
        break;
      }
    }
  }

  return {
    reached: bestProposalId !== null,
    winnerId: bestProposalId,
    consensusPercentage: bestApprovalRate * 100,
  };
}

// ---------------------------------------------------------------------------
// Action handlers
// ---------------------------------------------------------------------------

function handleCreateSwarm(body: CreateSwarmRequest): NextResponse {
  if (!body.task || typeof body.task !== "string") {
    return NextResponse.json(
      { success: false, error: "Missing or invalid 'task' — must be a non-empty string" },
      { status: 400 },
    );
  }

  if (!Array.isArray(body.agents) || body.agents.length === 0) {
    return NextResponse.json(
      { success: false, error: "Missing or invalid 'agents' — must be a non-empty array of agent IDs" },
      { status: 400 },
    );
  }

  const validStrategies: SwarmStrategy[] = ["consensus", "majority", "delegation", "race"];
  if (!body.strategy || !validStrategies.includes(body.strategy)) {
    return NextResponse.json(
      { success: false, error: `Missing or invalid 'strategy' — must be one of: ${validStrategies.join(", ")}` },
      { status: 400 },
    );
  }

  const maxRounds = body.maxRounds ?? 10;
  if (typeof maxRounds !== "number" || maxRounds < 1 || maxRounds > 100) {
    return NextResponse.json(
      { success: false, error: "Invalid 'maxRounds' — must be a number between 1 and 100" },
      { status: 400 },
    );
  }

  const swarm: SwarmSession = {
    id: generateSwarmId(),
    task: body.task,
    agents: [...new Set(body.agents)], // deduplicate
    strategy: body.strategy,
    maxRounds,
    currentRound: 1,
    status: "forming",
    proposals: [],
    winningProposalId: null,
    consensusPercentage: 0,
    createdAt: Date.now(),
    dissolvedAt: null,
    completedAt: null,
  };

  // Move to deliberating once formed
  swarm.status = "deliberating";

  swarms.set(swarm.id, swarm);

  return NextResponse.json({
    success: true,
    swarm,
  });
}

function handlePropose(body: ProposeRequest): NextResponse {
  const swarm = swarms.get(body.swarmId);
  if (!swarm) {
    return NextResponse.json(
      { success: false, error: `Swarm '${body.swarmId}' not found` },
      { status: 404 },
    );
  }

  if (swarm.status !== "deliberating" && swarm.status !== "forming") {
    return NextResponse.json(
      { success: false, error: `Swarm is '${swarm.status}' — proposals only accepted during 'forming' or 'deliberating'` },
      { status: 409 },
    );
  }

  if (!swarm.agents.includes(body.agentId)) {
    return NextResponse.json(
      { success: false, error: `Agent '${body.agentId}' is not a member of swarm '${body.swarmId}'` },
      { status: 403 },
    );
  }

  if (!body.proposal || typeof body.proposal !== "string") {
    return NextResponse.json(
      { success: false, error: "Missing or invalid 'proposal' — must be a non-empty string" },
      { status: 400 },
    );
  }

  if (typeof body.confidence !== "number" || body.confidence < 0 || body.confidence > 1) {
    return NextResponse.json(
      { success: false, error: "Invalid 'confidence' — must be a number between 0 and 1" },
      { status: 400 },
    );
  }

  const proposal: SwarmProposal = {
    id: generateProposalId(),
    swarmId: body.swarmId,
    agentId: body.agentId,
    proposal: body.proposal,
    confidence: body.confidence,
    votes: [],
    createdAt: Date.now(),
  };

  swarm.proposals.push(proposal);
  swarm.status = "deliberating";

  // For race strategy, check immediately if any proposal already has an approval
  if (swarm.strategy === "race") {
    const result = evaluateConsensus(swarm);
    if (result.reached && result.winnerId) {
      swarm.winningProposalId = result.winnerId;
      swarm.consensusPercentage = result.consensusPercentage;
    }
  }

  return NextResponse.json({
    success: true,
    proposal,
    swarmStatus: swarm.status,
    currentRound: swarm.currentRound,
  });
}

function handleVote(body: VoteRequest): NextResponse {
  const swarm = swarms.get(body.swarmId);
  if (!swarm) {
    return NextResponse.json(
      { success: false, error: `Swarm '${body.swarmId}' not found` },
      { status: 404 },
    );
  }

  if (swarm.status !== "deliberating") {
    return NextResponse.json(
      { success: false, error: `Swarm is '${swarm.status}' — votes only accepted during 'deliberating'` },
      { status: 409 },
    );
  }

  if (!swarm.agents.includes(body.agentId)) {
    return NextResponse.json(
      { success: false, error: `Agent '${body.agentId}' is not a member of swarm '${body.swarmId}'` },
      { status: 403 },
    );
  }

  const proposal = swarm.proposals.find((p) => p.id === body.proposalId);
  if (!proposal) {
    return NextResponse.json(
      { success: false, error: `Proposal '${body.proposalId}' not found in swarm '${body.swarmId}'` },
      { status: 404 },
    );
  }

  const validVotes: VoteChoice[] = ["approve", "reject", "abstain"];
  if (!body.vote || !validVotes.includes(body.vote)) {
    return NextResponse.json(
      { success: false, error: `Invalid 'vote' — must be one of: ${validVotes.join(", ")}` },
      { status: 400 },
    );
  }

  // Check if agent already voted on this proposal
  const existingVote = proposal.votes.find((v) => v.agentId === body.agentId);
  if (existingVote) {
    return NextResponse.json(
      { success: false, error: `Agent '${body.agentId}' has already voted on proposal '${body.proposalId}'` },
      { status: 409 },
    );
  }

  const vote: SwarmVote = {
    agentId: body.agentId,
    proposalId: body.proposalId,
    vote: body.vote,
    reasoning: body.reasoning ?? "",
    timestamp: Date.now(),
  };

  proposal.votes.push(vote);

  // Evaluate consensus after each vote
  const result = evaluateConsensus(swarm);
  swarm.consensusPercentage = result.consensusPercentage;

  if (result.reached && result.winnerId) {
    swarm.winningProposalId = result.winnerId;
  }

  // Check if we should advance the round
  // A round is complete when all agents have voted on at least one proposal
  const agentsWhoVotedThisRound = new Set<string>();
  for (const p of swarm.proposals) {
    for (const v of p.votes) {
      agentsWhoVotedThisRound.add(v.agentId);
    }
  }

  if (agentsWhoVotedThisRound.size >= swarm.agents.length) {
    if (swarm.currentRound < swarm.maxRounds) {
      swarm.currentRound++;
    } else if (!swarm.winningProposalId) {
      // Max rounds reached without consensus
      swarm.status = "completed";
      swarm.completedAt = Date.now();
      archiveSwarm(swarm);
      swarms.delete(swarm.id);

      return NextResponse.json({
        success: true,
        vote,
        consensusReached: false,
        swarmStatus: "completed",
        reason: "Max rounds reached without consensus",
        currentRound: swarm.currentRound,
      });
    }
  }

  return NextResponse.json({
    success: true,
    vote,
    consensusReached: swarm.winningProposalId !== null,
    winningProposalId: swarm.winningProposalId,
    consensusPercentage: swarm.consensusPercentage,
    swarmStatus: swarm.status,
    currentRound: swarm.currentRound,
  });
}

function handleExecute(body: ExecuteRequest): NextResponse {
  const swarm = swarms.get(body.swarmId);
  if (!swarm) {
    return NextResponse.json(
      { success: false, error: `Swarm '${body.swarmId}' not found` },
      { status: 404 },
    );
  }

  if (swarm.status === "executing") {
    return NextResponse.json(
      { success: false, error: "Swarm is already executing" },
      { status: 409 },
    );
  }

  if (swarm.status === "completed" || swarm.status === "dissolved") {
    return NextResponse.json(
      { success: false, error: `Swarm is '${swarm.status}' and cannot be executed` },
      { status: 409 },
    );
  }

  if (!swarm.winningProposalId) {
    return NextResponse.json(
      { success: false, error: "No winning proposal — consensus has not been reached" },
      { status: 409 },
    );
  }

  const winningProposal = swarm.proposals.find((p) => p.id === swarm.winningProposalId);
  if (!winningProposal) {
    return NextResponse.json(
      { success: false, error: "Winning proposal not found in swarm data" },
      { status: 500 },
    );
  }

  swarm.status = "executing";

  // Immediately mark as completed (execution is simulated)
  swarm.status = "completed";
  swarm.completedAt = Date.now();

  // Archive the completed swarm
  archiveSwarm(swarm);
  swarms.delete(swarm.id);

  return NextResponse.json({
    success: true,
    swarmId: swarm.id,
    status: "completed",
    winningProposal,
    consensusPercentage: swarm.consensusPercentage,
    roundsUsed: swarm.currentRound,
    executedAt: swarm.completedAt,
  });
}

function handleDissolve(body: DissolveRequest): NextResponse {
  const swarm = swarms.get(body.swarmId);
  if (!swarm) {
    return NextResponse.json(
      { success: false, error: `Swarm '${body.swarmId}' not found` },
      { status: 404 },
    );
  }

  if (swarm.status === "dissolved") {
    return NextResponse.json(
      { success: false, error: "Swarm is already dissolved" },
      { status: 409 },
    );
  }

  if (swarm.status === "completed") {
    return NextResponse.json(
      { success: false, error: "Swarm has already completed — cannot dissolve" },
      { status: 409 },
    );
  }

  swarm.status = "dissolved";
  swarm.dissolvedAt = Date.now();

  // Archive before removing
  archiveSwarm(swarm);
  swarms.delete(swarm.id);

  return NextResponse.json({
    success: true,
    swarmId: swarm.id,
    status: "dissolved",
    dissolvedAt: swarm.dissolvedAt,
    proposalsSubmitted: swarm.proposals.length,
    roundsCompleted: swarm.currentRound,
  });
}

// ---------------------------------------------------------------------------
// GET handler — swarm status
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const activeSwarms = Array.from(swarms.values()).map((s) => ({
      id: s.id,
      task: s.task,
      agents: s.agents,
      strategy: s.strategy,
      status: s.status,
      currentRound: s.currentRound,
      maxRounds: s.maxRounds,
      proposalsCount: s.proposals.length,
      winningProposalId: s.winningProposalId,
      consensusPercentage: s.consensusPercentage,
      createdAt: s.createdAt,
    }));

    // Build collective decisions from history
    const collectiveDecisions = swarmHistory
      .filter((s) => s.winningProposalId !== null)
      .map((s) => {
        const winner = s.proposals.find((p) => p.id === s.winningProposalId);
        return {
          swarmId: s.id,
          task: s.task,
          strategy: s.strategy,
          winningProposal: winner?.proposal ?? null,
          proposedBy: winner?.agentId ?? null,
          confidence: winner?.confidence ?? null,
          consensusPercentage: s.consensusPercentage,
          roundsUsed: s.currentRound,
          completedAt: s.completedAt,
        };
      });

    // Current consensus states for active swarms
    const consensusStates = Array.from(swarms.values()).map((s) => {
      const proposalSummaries = s.proposals.map((p) => {
        const approves = p.votes.filter((v) => v.vote === "approve").length;
        const rejects = p.votes.filter((v) => v.vote === "reject").length;
        const abstains = p.votes.filter((v) => v.vote === "abstain").length;
        return {
          id: p.id,
          agentId: p.agentId,
          confidence: p.confidence,
          approves,
          rejects,
          abstains,
          isWinning: p.id === s.winningProposalId,
        };
      });

      return {
        swarmId: s.id,
        task: s.task,
        strategy: s.strategy,
        status: s.status,
        currentRound: s.currentRound,
        consensusPercentage: s.consensusPercentage,
        hasWinner: s.winningProposalId !== null,
        proposals: proposalSummaries,
      };
    });

    return NextResponse.json({
      success: true,
      activeSwarms,
      activeCount: activeSwarms.length,
      swarmHistory: swarmHistory.slice(-20).reverse(),
      historyCount: swarmHistory.length,
      collectiveDecisions,
      consensusStates,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: `Failed to retrieve swarm status: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// POST handler — swarm operations
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  let body: SwarmActionRequest;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  if (!body.action || typeof body.action !== "string") {
    return NextResponse.json(
      { success: false, error: "Missing or invalid 'action' field" },
      { status: 400 },
    );
  }

  const validActions = ["create-swarm", "propose", "vote", "execute", "dissolve"];
  if (!validActions.includes(body.action)) {
    return NextResponse.json(
      { success: false, error: `Invalid 'action' — must be one of: ${validActions.join(", ")}` },
      { status: 400 },
    );
  }

  switch (body.action) {
    case "create-swarm":
      return handleCreateSwarm(body as CreateSwarmRequest);
    case "propose":
      return handlePropose(body as ProposeRequest);
    case "vote":
      return handleVote(body as VoteRequest);
    case "execute":
      return handleExecute(body as ExecuteRequest);
    case "dissolve":
      return handleDissolve(body as DissolveRequest);
    default:
      return NextResponse.json(
        { success: false, error: `Unhandled action: ${body.action}` },
        { status: 400 },
      );
  }
}
