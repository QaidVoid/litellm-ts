import type { ApiError } from "../error.ts";
import { httpError, streamError } from "../error.ts";
import type { ModelId } from "../models/mod.ts";
import type { Result } from "../result.ts";
import { err, ok, trySync } from "../result.ts";
import { parseSSE } from "../sse.ts";
import type { Transport } from "../transport.ts";

/** Request body for the legacy `/v1/completions` endpoint. */
export interface CompletionRequest {
  /** Completion-capable model id. */
  readonly model: ModelId;
  /** Single prompt string, multiple prompts, or token-id arrays. */
  readonly prompt: string | readonly string[] | readonly number[] | readonly (readonly number[])[];
  /** Text inserted after the completion in insertion-style endpoints. */
  readonly suffix?: string;
  /** Maximum tokens the model may produce. */
  readonly max_tokens?: number;
  /** Sampling temperature. */
  readonly temperature?: number;
  /** Nucleus sampling cutoff. */
  readonly top_p?: number;
  /** Number of completions to generate per call. */
  readonly n?: number;
  /** Include log-probability information for this many top tokens. */
  readonly logprobs?: number;
  /** Echo the prompt back in the response text. */
  readonly echo?: boolean;
  /** Sequences that, if emitted, end the completion. */
  readonly stop?: string | readonly string[];
  /** Presence penalty applied during sampling. */
  readonly presence_penalty?: number;
  /** Frequency penalty applied during sampling. */
  readonly frequency_penalty?: number;
  /** Generate `best_of` candidates server-side and return the highest scoring. */
  readonly best_of?: number;
  /** Per-token logit biases keyed by token id. */
  readonly logit_bias?: Readonly<Record<string, number>>;
  /** Opaque caller identifier forwarded to upstream abuse-detection systems. */
  readonly user?: string;
  /** Provider-specific deterministic-sampling seed. */
  readonly seed?: number;
}

/** Why the model stopped emitting tokens. */
export type CompletionFinishReason = "stop" | "length" | "content_filter";

/** Token-level log-probability detail (when `logprobs` was requested). */
export interface CompletionLogProbs {
  /** Token strings in emission order. */
  readonly tokens?: readonly string[];
  /** Log probability of each emitted token. */
  readonly token_logprobs?: readonly (number | null)[];
  /** Top alternative token log probabilities at each position. */
  readonly top_logprobs?: readonly Readonly<Record<string, number>>[];
  /** Character offset into the original text for each token. */
  readonly text_offset?: readonly number[];
}

/** A single completion candidate. */
export interface CompletionChoice {
  /** Generated text. */
  readonly text: string;
  /** Index of this choice within `choices`. */
  readonly index: number;
  /** Log-probability detail when `logprobs` was requested. */
  readonly logprobs?: CompletionLogProbs | null;
  /** Why the model stopped emitting tokens for this choice. */
  readonly finish_reason: CompletionFinishReason | null;
}

/** Token usage reported by the upstream provider. */
export interface CompletionUsage {
  /** Tokens consumed by the prompt. */
  readonly prompt_tokens: number;
  /** Tokens produced in the completion. */
  readonly completion_tokens: number;
  /** Sum of `prompt_tokens` and `completion_tokens`. */
  readonly total_tokens: number;
}

/** A completed (non-streaming) text completion response. */
export interface CompletionResponse {
  /** Server-assigned id. */
  readonly id: string;
  /** Discriminator, always `"text_completion"`. */
  readonly object: "text_completion";
  /** Unix epoch seconds when the response was created. */
  readonly created: number;
  /** Model that produced the response. */
  readonly model: string;
  /** Generated candidates. */
  readonly choices: readonly CompletionChoice[];
  /** Token accounting; not all providers populate this. */
  readonly usage?: CompletionUsage;
}

/** A single frame of a streaming text-completion response. */
export interface CompletionChunk {
  /** Server-assigned id; shared across chunks of one response. */
  readonly id: string;
  /** Discriminator, always `"text_completion"`. */
  readonly object: "text_completion";
  /** Unix epoch seconds when the chunk was created. */
  readonly created: number;
  /** Model that produced the chunk. */
  readonly model: string;
  /** One delta per choice. */
  readonly choices: readonly CompletionChoice[];
  /** Token usage; some providers send this only on the final chunk. */
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
