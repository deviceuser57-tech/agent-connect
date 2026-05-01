/**
 * AC-009 Core: Unified Error Schema
 * Enforces a strict, deterministic contract for system failures.
 */

export type ErrorCode = 
  | 'ENV_MISCONFIGURATION'
  | 'SUPABASE_CLIENT_INITIALIZATION_FAILED'
  | 'AUTH_SESSION_INVALID'
  | 'PROJECT_MISMATCH'
  | 'SERVER_FAILURE';

export interface UnifiedError {
  code: ErrorCode;
  message: string;
  probable_cause: string;
  recovery_step: string;
  timestamp: number;
}

export class RuntimeError extends Error {
  public code: ErrorCode;
  public missing?: string[];
  public mode?: string;
  public timestamp: number;
  public recovery: string;
  public probable_cause?: string;
  public fatal?: boolean;

  constructor(params: {
    code: ErrorCode;
    message?: string;
    missing?: string[];
    mode?: string;
    timestamp?: number;
    recovery: string;
    probable_cause?: string;
    fatal?: boolean;
  }) {
    super(params.message || params.code);
    this.name = 'RuntimeError';
    this.code = params.code;
    this.missing = params.missing;
    this.mode = params.mode;
    this.timestamp = params.timestamp || Date.now();
    this.recovery = params.recovery;
    this.probable_cause = params.probable_cause;
    this.fatal = params.fatal;
  }

  toJSON(): UnifiedError {
    return {
      code: this.code,
      message: this.message,
      probable_cause: this.probable_cause || 'Unknown',
      recovery_step: this.recovery,
      timestamp: this.timestamp
    };
  }
}
