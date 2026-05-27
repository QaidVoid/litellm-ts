import type { ApiError } from "../../error.ts";
import type { Result } from "../../result.ts";
import type { Transport } from "../../transport.ts";

/** Lifecycle status of a policy version. */
export type PolicyVersionStatus = "draft" | "published" | "production";

/** Condition gating when a policy applies. */
export interface PolicyCondition {
  /** Model name pattern (exact match or regex). */
  readonly model?: string;
}

/** Ordered guardrail pipeline attached to a policy. */
export interface PolicyPipeline {
  /** Execution mode, e.g. `"fail_fast"`. */
  readonly mode?: string;
  /** Pipeline steps in order. */
  readonly steps?: readonly Readonly<Record<string, unknown>>[];
  /** Provider-specific extras. */
  readonly [key: string]: unknown;
}

/** Request body for `POST /policies`. */
export interface CreatePolicyRequest {
  /** Unique policy name. */
  readonly policy_name: string;
  /** Parent policy to inherit from. */
  readonly inherit?: string;
  /** Human-readable description. */
  readonly description?: string;
  /** Guardrails to append (after inheritance). */
  readonly guardrails_add?: readonly string[];
  /** Guardrails to remove (after inheritance). */
  readonly guardrails_remove?: readonly string[];
  /** Condition for when this policy applies. */
  readonly condition?: PolicyCondition;
  /** Optional guardrail pipeline (`mode` + `steps`). */
  readonly pipeline?: PolicyPipeline;
}

/** Request body for `PUT /policies/{id}`. */
export interface UpdatePolicyRequest {
  /** Replace the policy name. */
  readonly policy_name?: string;
  /** Replace the parent policy. */
  readonly inherit?: string;
  /** Replace the description. */
  readonly description?: string;
  /** Replace the guardrails-add list. */
  readonly guardrails_add?: readonly string[];
  /** Replace the guardrails-remove list. */
  readonly guardrails_remove?: readonly string[];
  /** Replace the policy condition. */
  readonly condition?: PolicyCondition;
  /** Replace the pipeline. */
  readonly pipeline?: PolicyPipeline;
}

/** A single policy record. */
export interface Policy {
  /** Server-assigned id. */
  readonly policy_id: string;
  /** Policy name. */
  readonly policy_name: string;
  /** Version number across edits. */
  readonly version_number: number;
  /** Lifecycle status. */
  readonly version_status: PolicyVersionStatus;
  /** Id of the version this one was cloned from. */
  readonly parent_version_id?: string;
  /** True when this version is the latest by `version_number`. */
  readonly is_latest: boolean;
  /** ISO-8601 publication timestamp. */
  readonly published_at?: string;
  /** ISO-8601 production-promotion timestamp. */
  readonly production_at?: string;
  /** Parent policy name (inheritance). */
  readonly inherit?: string;
  /** Description. */
  readonly description?: string;
  /** Guardrails appended after inheritance. */
  readonly guardrails_add: readonly string[];
  /** Guardrails removed after inheritance. */
  readonly guardrails_remove: readonly string[];
  /** Policy condition. */
  readonly condition?: Readonly<Record<string, unknown>>;
  /** Pipeline definition. */
  readonly pipeline?: Readonly<Record<string, unknown>>;
  /** ISO-8601 creation timestamp. */
  readonly created_at?: string;
  /** ISO-8601 last-update timestamp. */
  readonly updated_at?: string;
  /** Identifier of the creating user. */
  readonly created_by?: string;
  /** Identifier of the last updating user. */
  readonly updated_by?: string;
}

/** Response from `GET /policies/list`. */
export interface ListPoliciesResponse {
  /** Returned policies. */
  readonly policies: readonly Policy[];
  /** Total policy count. */
  readonly total_count: number;
}

/** Query parameters for `GET /policies/list`. */
export interface ListPoliciesQuery {
  /** Filter by `version_status`. */
  readonly version_status?: PolicyVersionStatus;
}

/** Request body for `POST /policies/name/{name}/versions`. */
export interface CreatePolicyVersionRequest {
  /** Source policy id to clone from. Defaults to the current production version. */
  readonly source_policy_id?: string;
}

/** Request body for `PUT /policies/{id}/status`. */
export interface UpdatePolicyVersionStatusRequest {
  /** New status. */
  readonly version_status: "published" | "production";
}

/** Response from `GET /policies/name/{name}/versions`. */
export interface ListPolicyVersionsResponse {
  /** Policy name. */
  readonly policy_name: string;
  /** Snapshots ordered by `version_number` desc. */
  readonly versions: readonly Policy[];
  /** Total snapshot count. */
  readonly total_count: number;
}

/** Response from `GET /policies/compare`. */
export interface PolicyCompareResponse {
  /** First policy version. */
  readonly version_a: Policy;
  /** Second policy version. */
  readonly version_b: Policy;
  /** Field name → `{ version_a, version_b }` for differing fields. */
  readonly field_diffs: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
}

/** Request body for `POST /policies/attachments`. */
export interface CreatePolicyAttachmentRequest {
  /** Policy name to attach. */
  readonly policy_name: string;
  /** `"*"` for global scope. */
  readonly scope?: string;
  /** Team aliases or patterns the attachment applies to. */
  readonly teams?: readonly string[];
  /** Key aliases or patterns the attachment applies to. */
  readonly keys?: readonly string[];
  /** Model names or patterns the attachment applies to. */
  readonly models?: readonly string[];
  /** Tag patterns the attachment applies to. Supports wildcards. */
  readonly tags?: readonly string[];
}

/** A single policy attachment record. */
export interface PolicyAttachment {
  /** Attachment id. */
  readonly attachment_id: string;
  /** Attached policy name. */
  readonly policy_name: string;
  /** Scope, e.g. `"*"`. */
  readonly scope?: string;
  /** Team patterns. */
  readonly teams: readonly string[];
  /** Key patterns. */
  readonly keys: readonly string[];
  /** Model patterns. */
  readonly models: readonly string[];
  /** Tag patterns. */
  readonly tags: readonly string[];
  /** ISO-8601 creation timestamp. */
  readonly created_at?: string;
  /** ISO-8601 last-update timestamp. */
  readonly updated_at?: string;
  /** Identifier of the creating user. */
  readonly created_by?: string;
  /** Identifier of the last updating user. */
  readonly updated_by?: string;
}

/** Response from `GET /policies/attachments/list`. */
export interface ListPolicyAttachmentsResponse {
  /** Returned attachments. */
  readonly attachments: readonly PolicyAttachment[];
  /** Total attachment count. */
  readonly total_count: number;
}

/** Response from `POST /policies/attachments/estimate-impact`. */
export interface PolicyAttachmentImpactResponse {
  /** Number of keys the attachment would touch. */
  readonly affected_keys_count: number;
  /** Other impact fields the proxy may include. */
  readonly [key: string]: unknown;
}

/** Request body for `POST /policies/test-pipeline`. */
export interface TestPipelineRequest {
  /** Pipeline definition (`mode` + `steps`). */
  readonly pipeline: PolicyPipeline;
  /** Chat-style messages to run through the pipeline. */
  readonly test_messages: readonly Readonly<Record<string, string>>[];
}

/** Request body for `POST /policies/resolve`. */
export interface ResolvePoliciesRequest {
  /** Team alias to resolve for. */
  readonly team_alias?: string;
  /** Key alias to resolve for. */
  readonly key_alias?: string;
  /** Model name to resolve for. */
  readonly model?: string;
  /** Tags to resolve for. */
  readonly tags?: readonly string[];
}

/** A single matched policy in `ResolvePoliciesResponse.matched_policies`. */
export interface PolicyMatchDetail {
  /** Matched policy name. */
  readonly policy_name: string;
  /** How the policy was matched (e.g. `"scope:*"`, `"tag:healthcare"`). */
  readonly matched_via: string;
  /** Guardrails the policy contributes. */
  readonly guardrails_added: readonly string[];
}

/** Response from `POST /policies/resolve`. */
export interface ResolvePoliciesResponse {
  /** Final guardrails that would be applied. */
  readonly effective_guardrails: readonly string[];
  /** Per-match diagnostics. */
  readonly matched_policies: readonly PolicyMatchDetail[];
}

/** Query parameters for `POST /policies/resolve`. */
export interface ResolvePoliciesQuery {
  /** Force a DB sync before resolving. Default uses the in-memory cache. */
  readonly force_sync?: boolean;
}

/** Attachments sub-namespace under `client.policies.attachments`. */
export interface PolicyAttachmentsNamespace {
  /** List attachments. */
  list(): Promise<Result<ListPolicyAttachmentsResponse, ApiError>>;
  /** Retrieve an attachment by id. */
  get(attachmentId: string): Promise<Result<PolicyAttachment, ApiError>>;
  /** Create a new attachment. */
  create(
    req: CreatePolicyAttachmentRequest,
  ): Promise<Result<PolicyAttachment, ApiError>>;
  /** Delete an attachment by id. */
  delete(attachmentId: string): Promise<Result<unknown, ApiError>>;
  /** Estimate the impact of an attachment without persisting it. */
  estimateImpact(
    req: CreatePolicyAttachmentRequest,
  ): Promise<Result<PolicyAttachmentImpactResponse, ApiError>>;
}

/** Versions sub-namespace under `client.policies.versions`. */
export interface PolicyVersionsNamespace {
  /** List all versions of a policy. */
  list(policyName: string): Promise<Result<ListPolicyVersionsResponse, ApiError>>;
  /** Create a new draft version (cloning from production by default). */
  create(
    policyName: string,
    req?: CreatePolicyVersionRequest,
  ): Promise<Result<Policy, ApiError>>;
  /** Delete every version of a policy by name. */
  deleteAll(policyName: string): Promise<Result<unknown, ApiError>>;
}

/** Surface for the policy-engine endpoints on the `Client`. */
export interface PoliciesNamespace {
  /** List policies. */
  list(query?: ListPoliciesQuery): Promise<Result<ListPoliciesResponse, ApiError>>;
  /** Retrieve a policy by id. */
  get(policyId: string): Promise<Result<Policy, ApiError>>;
  /** Create a new policy. */
  create(req: CreatePolicyRequest): Promise<Result<Policy, ApiError>>;
  /** Update a policy. */
  update(policyId: string, req: UpdatePolicyRequest): Promise<Result<Policy, ApiError>>;
  /** Delete a single policy version by id. */
  delete(policyId: string): Promise<Result<unknown, ApiError>>;
  /** Update the lifecycle status of a policy version. */
  updateStatus(
    policyId: string,
    req: UpdatePolicyVersionStatusRequest,
  ): Promise<Result<Policy, ApiError>>;
  /** Resolved guardrails for a single policy. */
  resolvedGuardrails(policyId: string): Promise<Result<unknown, ApiError>>;
  /** Diff two policy versions by id. */
  compare(versionA: string, versionB: string): Promise<Result<PolicyCompareResponse, ApiError>>;
  /** Sandbox-execute a pipeline against sample messages. */
  testPipeline(req: TestPipelineRequest): Promise<Result<unknown, ApiError>>;
  /** Resolve the effective policy set for a context (team / key / model / tags). */
  resolve(
    req: ResolvePoliciesRequest,
    query?: ResolvePoliciesQuery,
  ): Promise<Result<ResolvePoliciesResponse, ApiError>>;
  /** Per-policy version administration. */
  readonly versions: PolicyVersionsNamespace;
  /** Policy-attachment administration. */
  readonly attachments: PolicyAttachmentsNamespace;
}

const encode = (s: string) => encodeURIComponent(s);

const filterUndefined = <T extends object>(
  q: T,
): Readonly<Record<string, string | number | boolean>> => {
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(q)) {
    if (v !== undefined) out[k] = v as string | number | boolean;
  }
  return out;
};

const createAttachments = (transport: Transport): PolicyAttachmentsNamespace => ({
  list() {
    return transport.request<ListPolicyAttachmentsResponse>({
      method: "GET",
      path: "/policies/attachments/list",
    });
  },
  get(attachmentId) {
    return transport.request<PolicyAttachment>({
      method: "GET",
      path: `/policies/attachments/${encode(attachmentId)}`,
    });
  },
  create(req) {
    return transport.request<PolicyAttachment>({
      method: "POST",
      path: "/policies/attachments",
      body: req,
    });
  },
  delete(attachmentId) {
    return transport.request<unknown>({
      method: "DELETE",
      path: `/policies/attachments/${encode(attachmentId)}`,
    });
  },
  estimateImpact(req) {
    return transport.request<PolicyAttachmentImpactResponse>({
      method: "POST",
      path: "/policies/attachments/estimate-impact",
      body: req,
    });
  },
});

const createVersions = (transport: Transport): PolicyVersionsNamespace => ({
  list(policyName) {
    return transport.request<ListPolicyVersionsResponse>({
      method: "GET",
      path: `/policies/name/${encode(policyName)}/versions`,
    });
  },
  create(policyName, req) {
    return transport.request<Policy>({
      method: "POST",
      path: `/policies/name/${encode(policyName)}/versions`,
      body: req ?? {},
    });
  },
  deleteAll(policyName) {
    return transport.request<unknown>({
      method: "DELETE",
      path: `/policies/name/${encode(policyName)}/all-versions`,
    });
  },
});

/** Bind a `PoliciesNamespace` to a constructed `Transport`. */
export const createPolicies = (transport: Transport): PoliciesNamespace => ({
  list(query) {
    return transport.request<ListPoliciesResponse>({
      method: "GET",
      path: "/policies/list",
      ...(query === undefined ? {} : { query: filterUndefined(query) }),
    });
  },
  get(policyId) {
    return transport.request<Policy>({
      method: "GET",
      path: `/policies/${encode(policyId)}`,
    });
  },
  create(req) {
    return transport.request<Policy>({
      method: "POST",
      path: "/policies",
      body: req,
    });
  },
  update(policyId, req) {
    return transport.request<Policy>({
      method: "PUT",
      path: `/policies/${encode(policyId)}`,
      body: req,
    });
  },
  delete(policyId) {
    return transport.request<unknown>({
      method: "DELETE",
      path: `/policies/${encode(policyId)}`,
    });
  },
  updateStatus(policyId, req) {
    return transport.request<Policy>({
      method: "PUT",
      path: `/policies/${encode(policyId)}/status`,
      body: req,
    });
  },
  resolvedGuardrails(policyId) {
    return transport.request<unknown>({
      method: "GET",
      path: `/policies/${encode(policyId)}/resolved-guardrails`,
    });
  },
  compare(versionA, versionB) {
    return transport.request<PolicyCompareResponse>({
      method: "GET",
      path: "/policies/compare",
      query: { version_a: versionA, version_b: versionB },
    });
  },
  testPipeline(req) {
    return transport.request<unknown>({
      method: "POST",
      path: "/policies/test-pipeline",
      body: req,
    });
  },
  resolve(req, query) {
    return transport.request<ResolvePoliciesResponse>({
      method: "POST",
      path: "/policies/resolve",
      body: req,
      ...(query === undefined ? {} : { query: filterUndefined(query) }),
    });
  },
  versions: createVersions(transport),
  attachments: createAttachments(transport),
});
