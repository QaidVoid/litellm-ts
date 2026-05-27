import type { ApiError } from "../../error.ts";
import type { Result } from "../../result.ts";
import type { Transport } from "../../transport.ts";

/** Request body for `/compliance/*`. Mirrors the spend log fields needed for evaluation. */
export interface ComplianceCheckRequest {
  readonly request_id: string;
  readonly user_id?: string;
  readonly model?: string;
  readonly timestamp?: string;
  readonly guardrail_information?: readonly Readonly<Record<string, unknown>>[];
}

/** Result of a single compliance check inside a `ComplianceResponse`. */
export interface ComplianceCheckResult {
  readonly check_name: string;
  readonly article: string;
  readonly passed: boolean;
  readonly detail: string;
}

/** Response from `/compliance/eu-ai-act` and `/compliance/gdpr`. */
export interface ComplianceResponse {
  readonly compliant: boolean;
  readonly regulation: string;
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
