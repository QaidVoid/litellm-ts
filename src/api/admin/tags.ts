import type { ApiError } from "../../error.ts";
import type { Result } from "../../result.ts";
import type { Transport } from "../../transport.ts";

/** Request body for `/tag/new`. */
export interface CreateTagRequest {
  /** Unique tag name. */
  readonly name: string;
  /** Free-form description. */
  readonly description?: string;
  /** Model allowlist tied to the tag. */
  readonly models?: readonly string[];
  /** Maps model_id to model_name. */
  readonly model_info?: Readonly<Record<string, string>>;
  /** Existing budget record id to attach. */
  readonly budget_id?: string;
  /** Hard spend ceiling in USD. */
  readonly max_budget?: number;
  /** Warning threshold below `max_budget`. */
  readonly soft_budget?: number;
  /** Maximum parallel in-flight requests. */
  readonly max_parallel_requests?: number;
  /** Tokens-per-minute ceiling. */
  readonly tpm_limit?: number;
  /** Requests-per-minute ceiling. */
  readonly rpm_limit?: number;
  /** Per-model budget map keyed by model name. */
  readonly model_max_budget?: Readonly<Record<string, unknown>>;
  /** Rolling window duration. */
  readonly budget_duration?: string;
}

/** Request body for `/tag/update`. */
export type UpdateTagRequest = CreateTagRequest;

/** Request body for `/tag/info`. */
export interface TagInfoRequest {
  /** Tag names to fetch. */
  readonly names: readonly string[];
}

/** Request body for `/tag/delete`. */
export interface DeleteTagRequest {
  /** Tag name to delete. */
  readonly name: string;
}

/** A tag record returned by `/tag/list` and `/tag/info`. */
export interface TagConfig {
  /** Tag name. */
  readonly name: string;
  /** Free-form description. */
  readonly description?: string;
  /** Model allowlist tied to the tag. */
  readonly models?: readonly string[];
  /** Maps model_id to model_name. */
  readonly model_info?: Readonly<Record<string, string>>;
  /** ISO-8601 creation timestamp. */
  readonly created_at?: string;
  /** ISO-8601 last-update timestamp. */
  readonly updated_at?: string;
  /** Identifier of the creating user. */
  readonly created_by?: string;
  /** Stored budget rollup row from the proxy database. */
  readonly litellm_budget_table?: Readonly<Record<string, unknown>>;
}

/** Query parameters for `/tag/list`. */
export interface ListTagsQuery {
  /** Restrict dynamic tags to those active in the window. */
  readonly start_date?: string;
  /** ISO-8601 upper bound (inclusive). */
  readonly end_date?: string;
}

/** Surface for tag administration on the `Client`. */
export interface TagsNamespace {
  /** Create a new tag. */
  create(req: CreateTagRequest): Promise<Result<unknown, ApiError>>;
  /** Update an existing tag. */
  update(req: UpdateTagRequest): Promise<Result<unknown, ApiError>>;
  /** Get information about specific tags. */
  info(req: TagInfoRequest): Promise<Result<Readonly<Record<string, TagConfig>>, ApiError>>;
  /** List all available tags. */
  list(query?: ListTagsQuery): Promise<Result<readonly TagConfig[], ApiError>>;
  /** Delete a tag by name. */
  delete(req: DeleteTagRequest): Promise<Result<{ readonly message: string }, ApiError>>;
}

const filterUndefined = <T extends object>(
  q: T,
): Readonly<Record<string, string | number | boolean>> => {
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(q)) {
    if (v !== undefined) out[k] = v as string | number | boolean;
  }
  return out;
};

/** Bind a `TagsNamespace` to a constructed `Transport`. */
export const createTags = (transport: Transport): TagsNamespace => ({
  create(req) {
    return transport.request<unknown>({ method: "POST", path: "/tag/new", body: req });
  },
  update(req) {
    return transport.request<unknown>({ method: "POST", path: "/tag/update", body: req });
  },
  info(req) {
    return transport.request<Readonly<Record<string, TagConfig>>>({
      method: "POST",
      path: "/tag/info",
      body: req,
    });
  },
  list(query) {
    return transport.request<readonly TagConfig[]>({
      method: "GET",
      path: "/tag/list",
      ...(query === undefined ? {} : { query: filterUndefined(query) }),
    });
  },
  delete(req) {
    return transport.request<{ readonly message: string }>({
      method: "POST",
      path: "/tag/delete",
      body: req,
    });
  },
});
