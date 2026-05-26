import type { ApiError } from "../error.ts";
import { httpError, streamError } from "../error.ts";
import type { ModelId } from "../models/mod.ts";
import type { Result } from "../result.ts";
import { err, ok, trySync } from "../result.ts";
import { parseSSE } from "../sse.ts";
import type { Transport } from "../transport.ts";

/** Request body for the legacy `/v1/completions` endpoint. */
export interface CompletionRequest {
  readonly model: ModelId;
  /** Single prompt string, multiple prompts, or token-id arrays. */
  readonly prompt: string | readonly string[] | readonly number[] | readonly (readonly number[])[];
  readonly suffix?: string;
  readonly max_tokens?: number;
  readonly temperature?: number;
  readonly top_p?: number;
  readonly n?: number;
  readonly logprobs?: number;
  readonly echo?: boolean;
  readonly stop?: string | readonly string[];
  readonly presence_penalty?: number;
  readonly frequency_penalty?: number;
  readonly best_of?: number;
  readonly logit_bias?: Readonly<Record<string, number>>;
  readonly user?: string;
  readonly seed?: number;
}

/** Why the model stopped emitting tokens. */
export type CompletionFinishReason = "stop" | "length" | "content_filter";

/** Token-level log-probability detail (when `logprobs` was requested). */
export interface CompletionLogProbs {
  readonly tokens?: readonly string[];
  readonly token_logprobs?: readonly (number | null)[];
  readonly top_logprobs?: readonly Readonly<Record<string, number>>[];
  readonly text_offset?: readonly number[];
}

/** A single completion candidate. */
export interface CompletionChoice {
  readonly text: string;
  readonly index: number;
  readonly logprobs?: CompletionLogProbs | null;
  readonly finish_reason: CompletionFinishReason | null;
}

/** Token usage reported by the upstream provider. */
export interface CompletionUsage {
  readonly prompt_tokens: number;
  readonly completion_tokens: number;
  readonly total_tokens: number;
}

/** A completed (non-streaming) text completion response. */
export interface CompletionResponse {
  readonly id: string;
  readonly object: "text_completion";
  readonly created: number;
  readonly model: string;
  readonly choices: readonly CompletionChoice[];
  readonly usage?: CompletionUsage;
}

/** A single frame of a streaming text-completion response. */
export interface CompletionChunk {
  readonly id: string;
  readonly object: "text_completion";
  readonly created: number;
  readonly model: string;
  readonly choices: readonly CompletionChoice[];
  readonly usage?: CompletionUsage;
}

/** Surface for the legacy completions endpoint on the `Client`. */
export interface CompletionsNamespace {
  /** Issue a non-streaming text completion. */
  create(req: CompletionRequest): Promise<Result<CompletionResponse, ApiError>>;
  /** Issue a streaming text completion. Yields per-frame `Result`s. */
  createStream(req: CompletionRequest): AsyncIterable<Result<CompletionChunk, ApiError>>;
}

const isErrorFrame = (data: unknown): data is { readonly error: unknown } =>
  typeof data === "object" && data !== null && "error" in data;

const streamChunks = async function* (
  transport: Transport,
  req: CompletionRequest,
): AsyncIterable<Result<CompletionChunk, ApiError>> {
  const streamResult = await transport.stream({
    method: "POST",
    path: "/v1/completions",
    body: { ...req, stream: true },
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
        httpError({ status: 0, statusText: "stream error frame", body: parsed.value }),
      );
      return;
    }
    yield ok(parsed.value as CompletionChunk);
  }
};

/** Bind a `CompletionsNamespace` to a constructed `Transport`. */
export const createCompletions = (transport: Transport): CompletionsNamespace => ({
  create(req) {
    return transport.request<CompletionResponse>({
      method: "POST",
      path: "/v1/completions",
      body: req,
    });
  },
  createStream(req) {
    return streamChunks(transport, req);
  },
});
