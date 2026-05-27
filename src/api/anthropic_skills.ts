import type { ApiError } from "../error.ts";
import { paginate } from "../pagination.ts";
import type { Result } from "../result.ts";
import type { Transport } from "../transport.ts";

/** Bytes-style input for skill bundle uploads. `Uint8Array`s are wrapped in a `Blob`. */
export type SkillFileInput = Blob | Uint8Array;

/** Request body for `POST /v1/skills` (multipart). */
export interface CreateSkillRequest {
  /** Display title shown in the Anthropic console. */
  readonly display_title: string;
  /** One or more zipped skill bundles to upload. */
  readonly files: readonly SkillFileInput[];
  /** Filenames attached to each bundle in order. Defaults to `"skill.zip"`. */
  readonly filenames?: readonly string[];
  /** Multi-account routing (e.g. `"claude-account-1"`). */
  readonly model?: string;
}

/** Query parameters for `GET /v1/skills`. */
export interface ListSkillsQuery {
  /** Maximum records per page. */
  readonly limit?: number;
  /** Cursor: return records after this id. */
  readonly after_id?: string;
  /** Cursor: return records before this id. */
  readonly before_id?: string;
  /** Opt into beta endpoint behavior. */
  readonly beta?: boolean;
}

/** A single skill record. */
export interface Skill {
  /** Server-assigned id. */
  readonly id: string;
  /** ISO-8601 creation timestamp. */
  readonly created_at: string;
  /** Display title shown in the console. */
  readonly display_title?: string;
  /** Identifier of the most recently published version. */
  readonly latest_version?: string;
  /** Origin of the skill, e.g. `"custom"` or `"anthropic"`. */
  readonly source: string;
  /** Discriminator, always `"skill"`. */
  readonly type: "skill";
}

/** Response from `GET /v1/skills`. */
export interface ListSkillsResponse {
  /** Skills on the current page. */
  readonly data: readonly Skill[];
  /** Cursor token for the next page. */
  readonly next_page?: string;
  /** True when more pages remain. */
  readonly has_more: boolean;
}

/** Response from `DELETE /v1/skills/{skill_id}`. */
export interface DeleteSkillResponse {
  /** Id of the deleted skill. */
  readonly id: string;
  /** Discriminator, always `"skill_deleted"`. */
  readonly type: "skill_deleted";
}

/**
 * Surface for the Anthropic Skills API on the `Client`.
 *
 * @beta The proxy tags `/v1/skills/*` as beta; shapes may change
 * between LiteLLM versions.
 */
export interface AnthropicSkillsNamespace {
  /** Create a new skill from one or more zipped bundles. */
  create(req: CreateSkillRequest): Promise<Result<Skill, ApiError>>;
  /** List skills with cursor pagination. */
  list(query?: ListSkillsQuery): Promise<Result<ListSkillsResponse, ApiError>>;
  /**
   * Auto-paginate `list` by feeding `next_page` back as `after_id` until
   * `has_more` is false. Yields one record at a time.
   */
  iterate(query?: ListSkillsQuery): AsyncIterable<Result<Skill, ApiError>>;
  /** Retrieve a skill by id. */
  retrieve(skillId: string): Promise<Result<Skill, ApiError>>;
  /** Delete a skill by id. */
  delete(skillId: string): Promise<Result<DeleteSkillResponse, ApiError>>;
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

const toBlob = (input: SkillFileInput): Blob =>
  input instanceof Blob ? input : new Blob([input as BlobPart]);

const buildSkillForm = (req: CreateSkillRequest): FormData => {
  const fd = new FormData();
  fd.append("display_title", req.display_title);
  if (req.model !== undefined) fd.append("model", req.model);
  req.files.forEach((file, i) => {
    fd.append("files[]", toBlob(file), req.filenames?.[i] ?? "skill.zip");
  });
  return fd;
};

/** Bind an `AnthropicSkillsNamespace` to a constructed `Transport`. */
export const createAnthropicSkills = (transport: Transport): AnthropicSkillsNamespace => ({
  create(req) {
    return transport.request<Skill>({
      method: "POST",
      path: "/v1/skills",
      body: buildSkillForm(req),
      query: { beta: true },
    });
  },
  list(query) {
    return transport.request<ListSkillsResponse>({
      method: "GET",
      path: "/v1/skills",
      query: { beta: true, ...filterUndefined(query ?? {}) },
    });
  },
  iterate(query) {
    return paginate<Skill, string>(query?.after_id, async (afterId) => {
      const merged: ListSkillsQuery = {
        ...(query ?? {}),
        ...(afterId === undefined ? {} : { after_id: afterId }),
      };
      const page = await this.list(merged);
      if (!page.ok) return page;
      return {
        ok: true,
        value: {
          items: page.value.data,
          next: page.value.has_more ? page.value.next_page : undefined,
        },
      };
    });
  },
  retrieve(skillId) {
    return transport.request<Skill>({
      method: "GET",
      path: `/v1/skills/${encode(skillId)}`,
      query: { beta: true },
    });
  },
  delete(skillId) {
    return transport.request<DeleteSkillResponse>({
      method: "DELETE",
      path: `/v1/skills/${encode(skillId)}`,
      query: { beta: true },
    });
  },
});
