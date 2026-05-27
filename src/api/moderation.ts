import type { ApiError } from "../error.ts";
import type { ModelsWithMode } from "../models/mod.ts";
import type { Result } from "../result.ts";
import type { Transport } from "../transport.ts";

/** Accepted input shapes for the moderation endpoint. */
export type ModerationInput = string | readonly string[];

/** Request body for `/v1/moderations`. */
export interface ModerationRequest {
  /** Moderation-capable model id. */
  readonly model: ModelsWithMode<"moderation">;
  /** Text(s) to score. Each entry produces one row in `results`. */
  readonly input: ModerationInput;
}

/** Per-category boolean flags. Keys vary by model; this is the OpenAI base set. */
export interface ModerationCategoryFlags {
  /** Sexually explicit content. */
  readonly sexual?: boolean;
  /** Sexual content involving minors. */
  readonly "sexual/minors"?: boolean;
  /** Hate speech. */
  readonly hate?: boolean;
  /** Threatening hate speech. */
  readonly "hate/threatening"?: boolean;
  /** Harassment. */
  readonly harassment?: boolean;
  /** Threatening harassment. */
  readonly "harassment/threatening"?: boolean;
  /** Self-harm content. */
  readonly "self-harm"?: boolean;
  /** Expressed intent to self-harm. */
  readonly "self-harm/intent"?: boolean;
  /** Instructions enabling self-harm. */
  readonly "self-harm/instructions"?: boolean;
  /** Violent content. */
  readonly violence?: boolean;
  /** Graphic depictions of violence. */
  readonly "violence/graphic"?: boolean;
  /** Illicit activity. */
  readonly illicit?: boolean;
  /** Violent illicit activity. */
  readonly "illicit/violent"?: boolean;
}

/** Per-category confidence scores in `[0, 1]`. */
export interface ModerationCategoryScores {
  /** Confidence score for `sexual`. */
  readonly sexual?: number;
  /** Confidence score for `sexual/minors`. */
  readonly "sexual/minors"?: number;
  /** Confidence score for `hate`. */
  readonly hate?: number;
  /** Confidence score for `hate/threatening`. */
  readonly "hate/threatening"?: number;
  /** Confidence score for `harassment`. */
  readonly harassment?: number;
  /** Confidence score for `harassment/threatening`. */
  readonly "harassment/threatening"?: number;
  /** Confidence score for `self-harm`. */
  readonly "self-harm"?: number;
  /** Confidence score for `self-harm/intent`. */
  readonly "self-harm/intent"?: number;
  /** Confidence score for `self-harm/instructions`. */
  readonly "self-harm/instructions"?: number;
  /** Confidence score for `violence`. */
  readonly violence?: number;
  /** Confidence score for `violence/graphic`. */
  readonly "violence/graphic"?: number;
  /** Confidence score for `illicit`. */
  readonly illicit?: number;
  /** Confidence score for `illicit/violent`. */
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
