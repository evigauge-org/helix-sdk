// packages/typescript/src/errors.ts

export type AEPErrorSymbol =
  | "authn_failed"
  | "authz_denied"
  | "capability_not_supported"
  | "ceiling_exceeded"
  | "budget_exhausted"
  | "tree_boundary_violation"
  | "subject_not_found"
  | "constitution_policy_violation"
  | "tool_not_found"
  | "version_mismatch"
  | "session_expired"
  | "lifecycle_conflict";

const CODE_TO_SYMBOL: Record<number, AEPErrorSymbol> = {
  [-32000]: "authn_failed",
  [-32001]: "authz_denied",
  [-32002]: "capability_not_supported",
  [-32003]: "ceiling_exceeded",
  [-32004]: "budget_exhausted",
  [-32005]: "tree_boundary_violation",
  [-32006]: "subject_not_found",
  [-32007]: "constitution_policy_violation",
  [-32008]: "tool_not_found",
  [-32009]: "version_mismatch",
  [-32010]: "session_expired",
  [-32011]: "lifecycle_conflict",
};

export class AEPError extends Error {
  readonly code: number;
  readonly symbol: AEPErrorSymbol | "unknown";
  readonly data: unknown;

  constructor(code: number, message: string, data?: unknown) {
    super(message);
    this.name = "AEPError";
    this.code = code;
    this.symbol = CODE_TO_SYMBOL[code] ?? "unknown";
    this.data = data;
  }
}

// Thrown when the runtime rejects a method call because the caller's token
// lacks the required scope (JSON-RPC error code -32001). Surfacing this as a
// typed subclass makes it easy to catch separately from generic errors:
//   try { ... } catch (e) { if (e instanceof AEPAuthzError) showUpgradeUI() }
export class AEPAuthzError extends AEPError {
  constructor(message: string, data?: unknown) {
    super(-32001, message, data);
    this.name = "AEPAuthzError";
  }
}

export class AEPTransportError extends Error {
  readonly cause?: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "AEPTransportError";
    this.cause = cause;
  }
}

export function fromJsonRpcError(err: { code: number; message: string; data?: unknown }): AEPError {
  if (err.code === -32001) return new AEPAuthzError(err.message, err.data);
  return new AEPError(err.code, err.message, err.data);
}
