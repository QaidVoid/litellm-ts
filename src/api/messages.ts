import type { ApiError } from "../error.ts";
import { httpError, streamError } from "../error.ts";
import type { ModelId } from "../models/mod.ts";
import type { Result } from "../result.ts";
import { err, ok, trySync } from "../result.ts";
import { parseSSE } from "../sse.ts";
import type { Transport } from "../transport.ts";

/** A single content block inside an Anthropic-shape message. Discriminated by `type`. */
export type MessagesContentBlock =
  | MessagesTextBlock
  | MessagesImageBlock
  | MessagesToolUseBlock
  | MessagesToolResultBlock
  | MessagesThinkingBlock;

/** Plain text content. */
export interface MessagesTextBlock {
  readonly type: "text";
  /** UTF-8 text. */
  readonly text: string;
}

/** A base64-encoded image attached to a user message. */
export interface MessagesImageBlock {
  readonly type: "image";
  readonly source: {
    readonly type: "base64";
    /** MIME type, e.g. `"image/png"`. */
    readonly media_type: string;
    /** Base64-encoded image bytes. */
    readonly data: string;
  };
}

/** Model-requested tool invocation. */
export interface MessagesToolUseBlock {
  readonly type: "tool_use";
  /** Stable identifier referenced by the matching `tool_result` block. */
  readonly id: string;
  /** Tool name the model picked. */
  readonly name: string;
  /** Already-parsed JSON arguments object. */
  readonly input: Readonly<Record<string, unknown>>;
}

/** Result of an executed tool, fed back to the model. */
export interface MessagesToolResultBlock {
  readonly type: "tool_result";
  /** Identifier from the preceding `tool_use` block. */
  readonly tool_use_id: string;
  /** Output as text or nested blocks. */
  readonly content: string | readonly MessagesContentBlock[];
  /** Mark a tool-side failure so the model can recover. */
  readonly is_error?: boolean;
}

/** Reasoning trace emitted by reasoning-capable models. */
export interface MessagesThinkingBlock {
  readonly type: "thinking";
  /** Free-form reasoning text. */
  readonly thinking: string;
}

/** A single message in the Anthropic Messages conversation. */
export interface MessagesMessage {
  readonly role: "user" | "assistant";
  readonly content: string | readonly MessagesContentBlock[];
}

/** A tool the model is allowed to call. */
export interface MessagesTool {
  /** Tool identifier the model uses when emitting a `tool_use` block. */
  readonly name: string;
  /** Description shaping when the model picks this tool. */
  readonly description?: string;
  /** JSON Schema for the input object. */
  readonly input_schema: Readonly<Record<string, unknown>>;
}

/** Strategy for forcing or restricting tool calls. */
export type MessagesToolChoice =
  | { readonly type: "auto" }
  | { readonly type: "any" }
  | { readonly type: "tool"; readonly name: string };

/** Request body for `/v1/messages`. */
export interface MessagesRequest {
  readonly model: ModelId;
  /** Maximum tokens the model may produce. Required by the upstream. */
  readonly max_tokens: number;
  /** Conversation history, oldest first. */
  readonly messages: readonly MessagesMessage[];
  /** Top-level instructions for the assistant. */
  readonly system?: string | readonly MessagesContentBlock[];
  /** Sampling temperature. */
  readonly temperature?: number;
  /** Nucleus sampling cutoff. */
  readonly top_p?: number;
  /** Vocabulary sampling cutoff. */
  readonly top_k?: number;
  /** Sequences that, if emitted, end the completion. */
  readonly stop_sequences?: readonly string[];
  /** Tools the model is allowed to invoke. */
  readonly tools?: readonly MessagesTool[];
  /** Strategy for forcing or restricting tool calls. */
  readonly tool_choice?: MessagesToolChoice;
  /** Opaque caller identifier forwarded to upstream abuse-detection systems. */
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/** Why the model stopped emitting tokens. */
export type MessagesStopReason =
  | "end_turn"
  | "max_tokens"
  | "stop_sequence"
  | "tool_use";

/** Token usage on a `MessagesResponse`. */
export interface MessagesUsage {
  readonly input_tokens: number;
  readonly output_tokens: number;
}

/** A completed (non-streaming) `/v1/messages` response. */
export interface MessagesResponse {
  /** Server-assigned message identifier. */
  readonly id: string;
  readonly type: "message";
  readonly role: "assistant";
  /** Model that produced the response. */
  readonly model: string;
  /** Generated content blocks. */
  readonly content: readonly MessagesContentBlock[];
  /** Why the model stopped, or `null` mid-stream. */
  readonly stop_reason: MessagesStopReason | null;
  /** Stop sequence that triggered termination, when `stop_reason` is `"stop_sequence"`. */
  readonly stop_sequence: string | null;
  readonly usage: MessagesUsage;
}

/** A single event in the streaming `/v1/messages` response. Discriminated by `type`. */
export type MessagesStreamEvent =
  | { readonly type: "message_start"; readonly message: MessagesResponse }
  | {
    readonly type: "content_block_start";
    readonly index: number;
    readonly content_block: MessagesContentBlock;
  }
  | {
    readonly type: "content_block_delta";
    readonly index: number;
    readonly delta:
      | { readonly type: "text_delta"; readonly text: string }
      | { readonly type: "input_json_delta"; readonly partial_json: string }
      | { readonly type: "thinking_delta"; readonly thinking: string };
  }
  | { readonly type: "content_block_stop"; readonly index: number }
  | {
    readonly type: "message_delta";
    readonly delta: {
      readonly stop_reason?: MessagesStopReason;
      readonly stop_sequence?: string | null;
    };
    readonly usage?: { readonly output_tokens: number };
  }
  | { readonly type: "message_stop" }
  | { readonly type: "ping" }
  | { readonly type: "error"; readonly error: { readonly type: string; readonly message: string } };

/** Request body for `/v1/messages/count_tokens`. */
export interface MessagesCountTokensRequest {
  /** Model the count is computed for; tokenization is model-specific. */
  readonly model: ModelId;
  /** Conversation history, oldest first. */
  readonly messages: readonly MessagesMessage[];
  /** Top-level instructions, counted alongside `messages`. */
  readonly system?: string | readonly MessagesContentBlock[];
  /** Tools whose schemas are counted toward the prompt total. */
  readonly tools?: readonly MessagesTool[];
}

/** Response from `/v1/messages/count_tokens`. */
export interface MessagesCountTokensResponse {
  /** Token count the upstream would charge for this prompt. */
  readonly input_tokens: number;
}

/** Surface for the Anthropic-shape `/v1/messages` endpoint. */
export interface MessagesNamespace {
  /** Issue a non-streaming `/v1/messages` request. */
  create(req: MessagesRequest): Promise<Result<MessagesResponse, ApiError>>;
  /**
   * Issue a streaming `/v1/messages` request. Yields one typed event per SSE
   * frame. Terminates on an explicit `message_stop` event or upstream
   * disconnect.
   */
  createStream(
    req: MessagesRequest,
  ): AsyncIterable<Result<MessagesStreamEvent, ApiError>>;
  /**
   * Count input tokens for an Anthropic-shape request without generating a
   * response. Accepts the same body as `create` but only requires the prompt
   * fields.
   */
  countTokens(
    req: MessagesCountTokensRequest,
  ): Promise<Result<MessagesCountTokensResponse, ApiError>>;
}

const isErrorFrame = (data: unknown): data is { readonly error: unknown } =>
  typeof data === "object" && data !== null && "error" in data &&
  (data as { type?: unknown }).type !== "error";

const streamEvents = async function* (
  transport: Transport,
  req: MessagesRequest,
): AsyncIterable<Result<MessagesStreamEvent, ApiError>> {
  const streamResult = await transport.stream({
    method: "POST",
    path: "/v1/messages",
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
        httpError({
          status: 0,
          statusText: "stream error frame",
          body: parsed.value,
        }),
      );
      return;
    }
    yield ok(parsed.value as MessagesStreamEvent);
  }
};

/** Bind a `MessagesNamespace` to a constructed `Transport`. */
export const createMessages = (transport: Transport): MessagesNamespace => ({
  create(req) {
    return transport.request<MessagesResponse>({
      method: "POST",
      path: "/v1/messages",
      body: req,
    });
  },
  createStream(req) {
    return streamEvents(transport, req);
  },
  countTokens(req) {
    return transport.request<MessagesCountTokensResponse>({
      method: "POST",
      path: "/v1/messages/count_tokens",
      body: req,
    });
  },
});
