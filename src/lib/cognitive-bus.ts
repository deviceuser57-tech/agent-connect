import { EventEmitter } from 'events';

export type CognitiveEvent = 
  | 'PROPOSAL_CREATED'
  | 'VOTE_SUBMITTED'
  | 'CONSENSUS_REACHED'
  | 'CONSENSUS_FAILED'
  | 'AGENT_HEARTBEAT';

/**
 * GlobalCognitiveBus (COL v2.0)
 * Responsibilities: Asynchronous message passing for distributed kernels.
 */
export class GlobalCognitiveBus extends EventEmitter {
  private static instance: GlobalCognitiveBus;

  static getInstance() {
    if (!GlobalCognitiveBus.instance) GlobalCognitiveBus.instance = new GlobalCognitiveBus();
    return GlobalCognitiveBus.instance;
  }

  broadcast(event: CognitiveEvent, payload: any) {
    console.log(`[BUS] ${new Date().toISOString()} | ${event} | ${JSON.stringify(payload)}`);
    this.emit(event, payload);
  }
}
