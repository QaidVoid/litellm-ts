import type { ApiError } from "../error.ts";
import type { ModelsWithMode } from "../models/mod.ts";
import type { Result } from "../result.ts";
import type { Transport } from "../transport.ts";

/** Accepted input shapes for the moderation endpoint. */
export type ModerationInput = string | readonly string[];

/** Request body for `/v1/moderations`. */
export interface ModerationRequest {
  readonly model: ModelsWithMode<"moderation">;
  /** Text(s) to score. Each entry produces one row in `results`. */
  readonly input: ModerationInput;
}

/** Per-category boolean flags. Keys vary by model; this is the OpenAI base set. */
export interface ModerationCategoryFlags {
  readonly sexual?: boolean;
  readonly "sexual/minors"?: boolean;
  readonly hate?: boolean;
  readonly "hate/threatening"?: boolean;
  readonly harassment?: boolean;
  readonly "harassment/threatening"?: boolean;
  readonly "self-harm"?: boolean;
  readonly "self-harm/intent"?: boolean;
  readonly "self-harm/instructions"?: boolean;
  readonly violence?: boolean;
  readonly "violence/graphic"?: boolean;
  readonly illicit?: boolean;
  readonly "illicit/violent"?: boolean;
}

/** Per-category confidence scores in `[0, 1]`. */
export interface ModerationCategoryScores {
  readonly sexual?: number;
  readonly "sexual/minors"?: number;
  readonly hate?: number;
  readonly "hate/threatening"?: number;
  readonly harassment?: number;
  readonly "harassment/threatening"?: number;
  readonly "self-harm"?: number;
  readonly "self-harm/intent"?: number;
  readonly "self-harm/instructions"?: number;
  readonly violence?: number;
  readonly "violence/graphic"?: number;
  readonly illicit?: number;
  readonly "illicit/violent"?: number;
}

/** A single scored row in a `ModerationResponse`. */
export interface ModerationResult {
  /** True when at least one category is flagged. */
  readonly flagged: boolean;
  /** Per-category boolean flags. */
  readonly categories: ModerationCategoryFlags;
  /** Per-category confidence scores. */
  readonly category_scores: ModerationCategoryScores;
}

/** A complete `/v1/moderations` response. */
export interface ModerationResponse {
  /** Server-assigned request identifier. */
  readonly id: string;
  /** Model that scored the inputs. */
  readonly model: string;
  /** One entry per input, in the same order. */
  readonly results: readonly ModerationResult[];
}

/** Surface for the moderation endpoint on the `Client`. */
export interface ModerationNamespace {
  /** Score one or more inputs for policy violations. */
  create(req: ModerationRequest): Promise<Result<ModerationResponse, ApiError>>;
}

/** Bind a `ModerationNamespace` to a constructed `Transport`. */
export const createModeration = (transport: Transport): ModerationNamespace => ({
  create(req) {
    return transport.request<ModerationResponse>({
      method: "POST",
      path: "/v1/moderations",
      body: req,
    });
  },
});
