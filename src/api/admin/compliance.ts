import type { ApiError } from "../../error.ts";
import type { Result } from "../../result.ts";
import type { Transport } from "../../transport.ts";

/** Request body for `/compliance/*`. Mirrors the spend log fields needed for evaluation. */
export interface ComplianceCheckRequest {
  /** Spend log request id to evaluate. */
  readonly request_id: string;
  /** User the request was attributed to. */
  readonly user_id?: string;
  /** Model the request was routed to. */
  readonly model?: string;
  /** ISO-8601 timestamp of the original request. */
  readonly timestamp?: string;
  /** Guardrail outputs captured for the request. */
  readonly guardrail_information?: readonly Readonly<Record<string, unknown>>[];
}

/** Result of a single compliance check inside a `ComplianceResponse`. */
export interface ComplianceCheckResult {
  /** Machine-readable check identifier. */
  readonly check_name: string;
  /** Regulation article the check maps to. */
  readonly article: string;
  /** True when the check passed. */
  readonly passed: boolean;
  /** Human-readable detail for the verdict. */
  readonly detail: string;
}

/** Response from `/compliance/eu-ai-act` and `/compliance/gdpr`. */
export interface ComplianceResponse {
  /** True when every check passed. */
  readonly compliant: boolean;
  /** Regulation name (e.g. `"EU AI Act"`). */
  readonly regulation: string;
  /** Individual check results. */
  readonly checks: readonly ComplianceCheckResult[];
}

/** Surface for compliance-check endpoints on the `Client`. */
export interface ComplianceNamespace {
  /** Run an EU AI Act compliance check for a spend log entry. */
  euAiAct(req: ComplianceCheckRequest): Promise<Result<ComplianceResponse, ApiError>>;
  /** Run a GDPR compliance check for a spend log entry. */
  gdpr(req: ComplianceCheckRequest): Promise<Result<ComplianceResponse, ApiError>>;
}

/** Bind a `ComplianceNamespace` to a constructed `Transport`. */
export const createCompliance = (transport: Transport): ComplianceNamespace => ({
  euAiAct(req) {
    return transport.request<ComplianceResponse>({
      method: "POST",
      path: "/compliance/eu-ai-act",
      body: req,
    });
  },
  gdpr(req) {
    return transport.request<ComplianceResponse>({
      method: "POST",
      path: "/compliance/gdpr",
      body: req,
    });
  },
});
