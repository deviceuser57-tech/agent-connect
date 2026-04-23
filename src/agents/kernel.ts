import { evaluateTransition } from '../lib/gec';
import { GlobalCognitiveBus } from '../lib/cognitive-bus';

/**
 * AutonomousAgent (Phase 6.2)
 * Responsibilities: Isolated reasoning and decoupled voting.
 */
export class AutonomousAgent {
  constructor(public agentId: string) {
    this.listen();
  }

  private listen() {
    const bus = GlobalCognitiveBus.getInstance();
    
    bus.on('PROPOSAL_CREATED', async (proposal) => {
      console.log(`[AGENT ${this.agentId}] Evaluating Proposal: ${proposal.negotiationId}`);
      
      // 1. Isolated Reasoning (Local GEC)
      const evaluation = evaluateTransition({
        currentState: proposal.fromState,
        event: proposal.event,
        data: proposal.payload,
        subgraph: [], // In real world, pulls its own localized subgraph
        modeState: { mode: 'EXECUTION', confidence: 1, entropyScore: 0, stabilityIndex: 1 }
      });

      // 2. Async Vote Submission
      setTimeout(() => {
        const vote = evaluation.isValid;
        bus.broadcast('VOTE_SUBMITTED', { 
          negotiationId: proposal.negotiationId, 
          voterId: this.agentId, 
          approve: vote 
        });
      }, Math.random() * 1000); // Simulated network latency
    });
  }
}
