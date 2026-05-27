import type { ApiError } from "../../error.ts";
import { httpError, streamError } from "../../error.ts";
import type { Result } from "../../result.ts";
import { err, ok, trySync } from "../../result.ts";
import { parseSSE } from "../../sse.ts";
import type { Transport } from "../../transport.ts";

/** Scope rows returned by `PolicySummary` and `PolicyInfoResponse`. */
export interface PolicyScopeResponse {
  /** Team aliases or patterns the policy applies to. */
  readonly teams: readonly string[];
  /** Key aliases or patterns the policy applies to. */
  readonly keys: readonly string[];
  /** Model names or patterns the policy applies to. */
  readonly models: readonly string[];
  /** Tag patterns the policy applies to. */
  readonly tags: readonly string[];
}

/** Guardrails add/remove block returned by policy listings. */
export interface PolicyGuardrailsResponse {
  /** Guardrails the policy contributes on top of inherited ones. */
  readonly add: readonly string[];
  /** Guardrails the policy removes from the inherited set. */
  readonly remove: readonly string[];
}

/** Single entry in `PolicyTemplatesListResponse.policies`. */
export interface PolicySummaryItem {
  /** Parent policy this one inherits from. */
  readonly inherit?: string | null;
  /** Scope rows (teams / keys / models / tags). */
  readonly scope: PolicyScopeResponse;
  /** Guardrails add/remove block. */
  readonly guardrails: PolicyGuardrailsResponse;
  /** Final guardrails list after applying inheritance. */
  readonly resolved_guardrails: readonly string[];
  /** Inheritance chain from root parent down to this policy. */
  readonly inheritance_chain: readonly string[];
}

/** Response from `GET /policy/list`. */
export interface PolicyListResponse {
  /** Map of policy name to its summary. */
  readonly policies: Readonly<Record<string, PolicySummaryItem>>;
  /** Total count of loaded policies. */
  readonly total_count: number;
}

/** Response from `GET /policy/info/{policy_name}`. */
export interface PolicyInfoResponse {
  /** Name of the queried policy. */
  readonly policy_name: string;
  /** Parent policy this one inherits from. */
  readonly inherit?: string | null;
  /** Scope rows (teams / keys / models / tags). */
  readonly scope: PolicyScopeResponse;
  /** Guardrails add/remove block. */
  readonly guardrails: PolicyGuardrailsResponse;
  /** Final guardrails list after applying inheritance. */
  readonly resolved_guardrails: readonly string[];
  /** Inheritance chain from root parent down to this policy. */
  readonly inheritance_chain: readonly string[];
}

/** Context body for `POST /policy/test`. */
export interface PolicyMatchContext {
  /** Team alias from the would-be request. */
  readonly team_alias?: string | null;
  /** Key alias from the would-be request. */
  readonly key_alias?: string | null;
  /** Model name from the would-be request. */
  readonly model?: string | null;
  /** Tags from key/team metadata. */
  readonly tags?: readonly string[] | null;
}

/** Response from `POST /policy/test`. */
export interface PolicyTestResponse {
  /** Echo of the context used for matching. */
  readonly context: PolicyMatchContext;
  /** Names of every policy that matched. */
  readonly matching_policies: readonly string[];
  /** Final resolved guardrails for the matched policies. */
  readonly resolved_guardrails: readonly string[];
  /** Optional diagnostic message, e.g. when the policy engine is uninitialized. */
  readonly message?: string;
}

/** Request body for `POST /policy/validate`. */
export interface PolicyValidateRequest {
  /** Policy configuration to validate (map of policy name to definition). */
  readonly policies: Readonly<Record<string, unknown>>;
}

/** Validation error kinds returned by `POST /policy/validate`. */
export type PolicyValidationErrorType =
  | "invalid_guardrail"
  | "invalid_team"
  | "invalid_key"
  | "invalid_model"
  | "invalid_inheritance"
  | "circular_inheritance"
  | "invalid_scope"
  | "invalid_syntax";

/** A single error or warning entry in `PolicyValidationResponse`. */
export interface PolicyValidationError {
  /** Name of the policy with the issue. */
  readonly policy_name: string;
  /** Kind of validation error. */
  readonly error_type: PolicyValidationErrorType;
  /** Human-readable error message. */
  readonly message: string;
  /** Specific field that triggered the error (e.g. `"guardrails.add"`). */
  readonly field?: string | null;
  /** The invalid value, when applicable. */
  readonly value?: string | null;
}

/** Response from `POST /policy/validate`. */
export interface PolicyValidationResponse {
  /** True when no blocking errors were found. */
  readonly valid: boolean;
  /** Blocking validation errors. */
  readonly errors: readonly PolicyValidationError[];
  /** Non-blocking validation warnings. */
  readonly warnings: readonly PolicyValidationError[];
}

/** Request body for the `/policy/templates/enrich*` endpoints. */
export interface PolicyTemplateEnrichRequest {
  /** Template id to enrich. */
  readonly template_id: string;
  /** Template parameters bag. Must include the LLM enrichment parameter. */
  readonly parameters: Readonly<Record<string, unknown>>;
  /** Override the LLM used for discovery. Defaults to the proxy's configured discovery model. */
  readonly model?: string;
  /** Skip discovery by passing an explicit competitor list. */
  readonly competitors?: readonly string[];
  /** Free-form refinement instruction, e.g. `"add 10 more from Asia"`. */
  readonly instruction?: string;
}

/** Response from `POST /policy/templates/enrich`. */
export interface PolicyTemplateEnrichResponse {
  /** Enriched guardrail definitions ready to register. */
  readonly guardrailDefinitions: readonly Readonly<Record<string, unknown>>[];
  /** Discovered competitor canonical names. */
  readonly competitors: readonly string[];
  /** Map of canonical name to its alternate spellings. */
  readonly competitor_variations: Readonly<Record<string, readonly string[]>>;
}

/** Request body for `POST /policy/templates/suggest`. */
export interface PolicyTemplateSuggestRequest {
  /** Example attack inputs to match templates against. */
  readonly attack_examples?: readonly string[];
  /** Free-form description of the desired protection. */
  readonly description?: string;
  /** Override the LLM used for matching. */
  readonly model?: string;
}

/** Request body for `POST /policy/templates/test`. */
export interface PolicyTemplateTestRequest {
  /** Guardrail definitions extracted from a template to run. */
  readonly guardrail_definitions: readonly Readonly<Record<string, unknown>>[];
  /** Test input text run through every guardrail. */
  readonly text: string;
}

/** A single per-guardrail row in `PolicyTemplateTestResponse.results`. */
export interface PolicyTemplateTestResultEntry {
  /** Guardrail name. */
  readonly guardrail_name: string;
  /** Action taken: `"passed"`, `"blocked"`, `"masked"`, `"unsupported"`, `"error"`. */
  readonly action: string;
  /** Output text after running the guardrail. */
  readonly output_text: string;
  /** Free-form diagnostic detail. */
  readonly details: string;
}

/** Response from `POST /policy/templates/test`. */
export interface PolicyTemplateTestResponse {
  /** Worst-case action across the entire guardrail set. */
  readonly overall_action: string;
  /** Per-guardrail result rows. */
  readonly results: readonly PolicyTemplateTestResultEntry[];
}

/** Surface for in-memory policy templates and validation on the `Client`. */
export interface PolicyTemplatesNamespace {
  /** List all loaded policies, with their resolved guardrails. */
  list(): Promise<Result<PolicyListResponse, ApiError>>;
  /** Retrieve a single policy by name. */
  info(policyName: string): Promise<Result<PolicyInfoResponse, ApiError>>;
  /** Test which policies would match a given request context. */
  test(context: PolicyMatchContext): Promise<Result<PolicyTestResponse, ApiError>>;
  /** Validate a policy configuration body before applying it. */
  validate(
    req: PolicyValidateRequest,
  ): Promise<Result<PolicyValidationResponse, ApiError>>;
  /**
   * Fetch the policy template catalog (UI presets). Returns an array of
   * template objects whose schema is template-specific.
   */
  templates(): Promise<Result<readonly Readonly<Record<string, unknown>>[], ApiError>>;
  /** Enrich a template (e.g. competitor discovery) and return the populated definitions. */
  enrich(
    req: PolicyTemplateEnrichRequest,
  ): Promise<Result<PolicyTemplateEnrichResponse, ApiError>>;
  /**
   * Streaming variant of `enrich`: yields one parsed SSE payload per chunk.
   * Errors during the stream surface as failed results without terminating
   * iteration unless the server emits an error frame.
   */
  enrichStream(
    req: PolicyTemplateEnrichRequest,
  ): AsyncIterable<Result<unknown, ApiError>>;
  /** Ask an LLM to recommend templates from attack examples / a description. */
  suggest(
    req: PolicyTemplateSuggestRequest,
  ): Promise<Result<Readonly<Record<string, unknown>>, ApiError>>;
  /** Run a template's guardrails against sample text without creating them. */
  testTemplate(
    req: PolicyTemplateTestRequest,
  ): Promise<Result<PolicyTemplateTestResponse, ApiError>>;
}

const encode = (s: string) => encodeURIComponent(s);

const isErrorFrame = (data: unknown): data is { readonly error: unknown } =>
  typeof data === "object" && data !== null && "error" in data;

const streamEnrichEvents = async function* (
  transport: Transport,
  req: PolicyTemplateEnrichRequest,
): AsyncIterable<Result<unknown, ApiError>> {
  const streamResult = await transport.stream({
    method: "POST",
    path: "/policy/templates/enrich/stream",
    body: req,
  });
  if (!streamResult.ok) {
    yield err(streamResult.error);
    return;
  }
  for await (const event of parseSSE(streamResult.value)) {
    if (event.data === "[DONE]") return;
    const parsed = trySync<unknown>(() => JSON.parse(event.data));
    if (!parsed.ok) {
      yield err(streamError({ reason: "parse", cause: parsed.error }));
      continue;
    }
    if (isErrorFrame(parsed.value)) {
      yield err(
        httpError({
          status: 0,
          statusText: "stream error frame",
          body: parsed.value,
        }),
      );
      return;
    }
    yield ok(parsed.value);
  }
};

/** Bind a `PolicyTemplatesNamespace` to a constructed `Transport`. */
export const createPolicyTemplates = (transport: Transport): PolicyTemplatesNamespace => ({
  list() {
    return transport.request<PolicyListResponse>({ method: "GET", path: "/policy/list" });
  },
  info(policyName) {
    return transport.request<PolicyInfoResponse>({
      method: "GET",
      path: `/policy/info/${encode(policyName)}`,
    });
  },
  test(context) {
    return transport.request<PolicyTestResponse>({
      method: "POST",
      path: "/policy/test",
      body: context,
    });
  },
  validate(req) {
    return transport.request<PolicyValidationResponse>({
      method: "POST",
      path: "/policy/validate",
      body: req,
    });
  },
  templates() {
    return transport.request<readonly Readonly<Record<string, unknown>>[]>({
      method: "GET",
      path: "/policy/templates",
    });
  },
  enrich(req) {
    return transport.request<PolicyTemplateEnrichResponse>({
      method: "POST",
      path: "/policy/templates/enrich",
      body: req,
    });
  },
  enrichStream(req) {
    return streamEnrichEvents(transport, req);
  },
  suggest(req) {
    return transport.request<Readonly<Record<string, unknown>>>({
      method: "POST",
      path: "/policy/templates/suggest",
      body: req,
    });
  },
  testTemplate(req) {
    return transport.request<PolicyTemplateTestResponse>({
      method: "POST",
      path: "/policy/templates/test",
      body: req,
    });
  },
});
