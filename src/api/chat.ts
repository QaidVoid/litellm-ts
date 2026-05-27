import type { ApiError } from "../error.ts";
import { httpError, streamError } from "../error.ts";
import type { ModelId, ModelsWithCapability } from "../models/mod.ts";
import type { Result } from "../result.ts";
import { err, ok, trySync } from "../result.ts";
import { parseSSE } from "../sse.ts";
import type { Transport } from "../transport.ts";

/** A single message in a chat completion request. Discriminated by `role`. */
export type ChatMessage =
  | ChatSystemMessage
  | ChatUserMessage
  | ChatAssistantMessage
  | ChatToolMessage;

/**
 * Message union for requests whose model does not declare `vision`. Identical
 * to `ChatMessage` except user content cannot include image parts.
 */
export type ChatTextOnlyMessage =
  | ChatSystemMessage
  | ChatTextOnlyUserMessage
  | ChatAssistantMessage
  | ChatToolMessage;

/** A system instruction message. */
export interface ChatSystemMessage {
  /** Discriminator, always `"system"`. */
  readonly role: "system";
  /** Free-form system instructions. */
  readonly content: string;
  /** Optional speaker name. Some providers expose it to the model. */
  readonly name?: string;
}

/** A user-authored message. `content` may be a string or a multi-part array. */
export interface ChatUserMessage {
  /** Discriminator, always `"user"`. */
  readonly role: "user";
  /** Plain text or an ordered array of content parts (text and image inputs). */
  readonly content: string | readonly ChatUserContentPart[];
  /** Optional speaker name. Some providers expose it to the model. */
  readonly name?: string;
}

/**
 * Restricted user message used when the chosen model does not declare the
 * `vision` capability. The compiler refuses image content parts on requests
 * keyed by such a model.
 */
export interface ChatTextOnlyUserMessage {
  /** Discriminator, always `"user"`. */
  readonly role: "user";
  /** Plain text or an array of text-only content parts. */
  readonly content: string | readonly ChatTextPart[];
  /** Optional speaker name. Some providers expose it to the model. */
  readonly name?: string;
}

/**
 * A model-authored message echoed back in conversation history. May carry
 * tool calls instead of text content.
 */
export interface ChatAssistantMessage {
  /** Discriminator, always `"assistant"`. */
  readonly role: "assistant";
  /** Generated text. `null` when the model decided to emit `tool_calls` instead. */
  readonly content: string | null;
  /** Optional speaker name attached by the upstream. */
  readonly name?: string;
  /** Tool calls the model wants the caller to execute. */
  readonly tool_calls?: readonly ChatToolCall[];
}

/** Output of a tool invocation, referenced by `tool_call_id`. */
export interface ChatToolMessage {
  /** Discriminator, always `"tool"`. */
  readonly role: "tool";
  /** Matches the `id` of the assistant's `tool_calls[i]`. */
  readonly tool_call_id: string;
  /** JSON-stringified or plain-text result of the tool. */
  readonly content: string;
}

/** A single content part inside a user message with multi-modal input. */
export type ChatUserContentPart = ChatTextPart | ChatImageUrlPart;

/** Plain text segment in a multi-modal user message. */
export interface ChatTextPart {
  /** Discriminator, always `"text"`. */
  readonly type: "text";
  /** UTF-8 text. */
  readonly text: string;
}

/** Image segment in a multi-modal user message. Only available on vision-capable models. */
export interface ChatImageUrlPart {
  /** Discriminator, always `"image_url"`. */
  readonly type: "image_url";
  /** Image source and rendering hints. */
  readonly image_url: {
    /** Either an `https://` URL or a `data:` URI of base64-encoded bytes. */
    readonly url: string;
    /** Detail level the upstream should preserve. Defaults to `"auto"`. */
    readonly detail?: "auto" | "low" | "high";
  };
}

/** A tool the model may invoke. Only function-type tools are supported in v0.1. */
export interface ChatTool {
  /** Discriminator, always `"function"`. */
  readonly type: "function";
  /** Function declaration the model may call. */
  readonly function: {
    /** Function identifier the model uses when emitting a tool call. */
    readonly name: string;
    /** Free-form description that shapes when the model picks this tool. */
    readonly description?: string;
    /** JSON Schema for the function's argument object. */
    readonly parameters?: Readonly<Record<string, unknown>>;
  };
}

/** A tool call emitted by the model. */
export interface ChatToolCall {
  /** Stable identifier the caller uses when replying with a `ChatToolMessage`. */
  readonly id: string;
  /** Discriminator, always `"function"`. */
  readonly type: "function";
  /** Tool function name and arguments. */
  readonly function: {
    /** Matches the `name` of the declared `ChatTool`. */
    readonly name: string;
    /** JSON-encoded arguments. Parse before invoking the tool. */
    readonly arguments: string;
  };
}

/** Strategy for forcing or restricting tool calls. */
export type ChatToolChoice =
  | "none"
  | "auto"
  | "required"
  | {
    readonly type: "function";
    readonly function: { readonly name: string };
  };

/** Format the model should produce its response in. */
export type ChatResponseFormat =
  | { readonly type: "text" }
  | { readonly type: "json_object" };

/** Fields that are valid on every chat completion request, excluding `messages`. */
export interface ChatRequestBaseCore {
  /** Sampling temperature. Higher values produce more varied output. */
  readonly temperature?: number;
  /** Nucleus sampling cutoff. Typically used as an alternative to `temperature`. */
  readonly top_p?: number;
  /** Legacy maximum output tokens. Prefer `max_completion_tokens` on newer models. */
  readonly max_tokens?: number;
  /** Maximum tokens the model may produce in the response. */
  readonly max_completion_tokens?: number;
  /** Number of completions to generate per call. */
  readonly n?: number;
  /** One or more strings that, if emitted, end the completion. */
  readonly stop?: string | readonly string[];
  /** Increases the likelihood of new topics. Range varies by provider. */
  readonly presence_penalty?: number;
  /** Decreases the likelihood of repeated tokens. Range varies by provider. */
  readonly frequency_penalty?: number;
  /** Opaque caller identifier forwarded to upstream abuse-detection systems. */
  readonly user?: string;
  /** Constrain the model output to a specific format. */
  readonly response_format?: ChatResponseFormat;
  /** Provider-specific deterministic-sampling seed. */
  readonly seed?: number;
}

/**
 * Base fields for a vision-capable request. `messages` may contain image
 * content parts.
 */
export interface ChatRequestBase extends ChatRequestBaseCore {
  /** Conversation history, oldest first. */
  readonly messages: readonly ChatMessage[];
}

/**
 * Base fields when the chosen model does not declare `vision`. Image content
 * parts are not part of the message type, so the compiler refuses them.
 */
export interface ChatRequestBaseTextOnly extends ChatRequestBaseCore {
  /** Conversation history, oldest first. Image content is not allowed here. */
  readonly messages: readonly ChatTextOnlyMessage[];
}

/**
 * Fields permitted only when the chosen model declares the `function_calling`
 * capability. Adding any of these to a request keyed on a non-function-calling
 * model is a type error at the call site.
 */
export interface ChatToolFields {
  /** Tools the model is allowed to invoke during the response. */
  readonly tools?: readonly ChatTool[];
  /** Strategy for forcing or restricting tool use. Defaults to `"auto"`. */
  readonly tool_choice?: ChatToolChoice;
  /** Permit the model to emit multiple tool calls in a single turn. */
  readonly parallel_tool_calls?: boolean;
}

/**
 * A chat completion request body. Parameterized by the model literal so the
 * shape adapts to the model's declared capabilities:
 *
 * - `tools` / `tool_choice` / `parallel_tool_calls` appear only when the model
 *   declares `function_calling`.
 * - Message content parts may include `image_url` only when the model
 *   declares `vision`; otherwise the user-message content type is text-only.
 *
 * Field names match the OpenAI-compatible wire format.
 */
export type ChatCompletionRequest<M extends ModelId = ModelId> =
  & { readonly model: M }
  & (
    // `customModel(...)` resolves to `never` so the SDK can't gate on
    // capabilities it doesn't know about; widen to the lenient branch.
    [M] extends [never] ? ChatRequestBase
      : (M extends ModelsWithCapability<"vision"> ? ChatRequestBase : ChatRequestBaseTextOnly)
  )
  & (
    [M] extends [never] ? ChatToolFields
      : (M extends ModelsWithCapability<"function_calling"> ? ChatToolFields
        : Record<never, never>)
  );

/** Why the model stopped producing tokens. */
export type ChatFinishReason =
  | "stop"
  | "length"
  | "tool_calls"
  | "content_filter"
  | "function_call";

/** A single completion candidate in the response. */
export interface ChatChoice {
  /** Index of this choice within `choices`. */
  readonly index: number;
  /** The assistant message produced for this choice. */
  readonly message: {
    /** Discriminator, always `"assistant"`. */
    readonly role: "assistant";
    /** Final text content, or `null` when the model emitted tool calls instead. */
    readonly content: string | null;
    /** Tool calls the model wants executed. */
    readonly tool_calls?: readonly ChatToolCall[];
  };
  /** Why the model stopped, or `null` if still running (shouldn't appear in a non-stream response). */
  readonly finish_reason: ChatFinishReason | null;
}

/** Token usage reported by the upstream provider. */
export interface ChatUsage {
  /** Tokens consumed by the request prompt. */
  readonly prompt_tokens: number;
  /** Tokens produced in the response. */
  readonly completion_tokens: number;
  /** Sum of `prompt_tokens` and `completion_tokens`. */
  readonly total_tokens: number;
}

/** A completed (non-streaming) chat completion response. */
export interface ChatCompletion {
  /** Server-assigned completion identifier. */
  readonly id: string;
  /** Discriminator, always `"chat.completion"`. */
  readonly object: "chat.completion";
  /** Unix timestamp (seconds) of completion creation. */
  readonly created: number;
  /** Model that produced the response (may differ from request `model` if upstream substitutes). */
  readonly model: string;
  /** Non-empty array of completion candidates. */
  readonly choices: readonly ChatChoice[];
  /** Token accounting. Not all providers populate this. */
  readonly usage?: ChatUsage;
}

/**
 * A streamed tool call fragment. Tool calls are streamed by `index` because
 * `id`, `name`, and `arguments` can each arrive in separate chunks.
 */
export interface ChatChunkToolCall {
  /** Position of the tool call within the assistant message. */
  readonly index: number;
  /** Server-assigned identifier. Appears once, then is reused by index. */
  readonly id?: string;
  /** Discriminator, always `"function"`. */
  readonly type?: "function";
  /** Streamed function-call fragments. */
  readonly function?: {
    /** Function name. Streamed once. */
    readonly name?: string;
    /** Partial JSON-encoded arguments. Concatenate chunks by `index` to rebuild. */
    readonly arguments?: string;
  };
}

/** A single streamed delta in a `ChatCompletionChunk`. */
export interface ChatChunkChoice {
  /** Position of this choice within the response's `choices` array. */
  readonly index: number;
  /** Incremental delta over the previous chunk for this choice. */
  readonly delta: {
    /** Role tag. Streamed on the first chunk only. */
    readonly role?: "assistant";
    /** Newly produced text. Concatenate across chunks to assemble the response. */
    readonly content?: string | null;
    /** Streamed tool call fragments. Merge by `index`. */
    readonly tool_calls?: readonly ChatChunkToolCall[];
  };
  /** Set on the final chunk for this choice. */
  readonly finish_reason?: ChatFinishReason | null;
}

/** A single frame of a streaming chat completion response. */
export interface ChatCompletionChunk {
  /** Server-assigned completion identifier. Shared across chunks. */
  readonly id: string;
  /** Discriminator, always `"chat.completion.chunk"`. */
  readonly object: "chat.completion.chunk";
  /** Unix timestamp (seconds) of chunk creation. */
  readonly created: number;
  /** Model that produced the chunk. */
  readonly model: string;
  /** One delta per choice. Multiple choices possible when `n > 1`. */
  readonly choices: readonly ChatChunkChoice[];
  /** Token usage; some providers send this only on the final chunk. */
  readonly usage?: ChatUsage;
}

/** Per-call options shared by every streaming entry point. */
export interface StreamCallOptions {
  /**
   * Abort the in-flight stream. Aborting after the iteration starts
   * cancels the underlying response body so the consumer's `for await`
   * loop exits promptly and the connection is released.
   */
  readonly signal?: AbortSignal;
}

/** Surface for chat endpoints on the `Client`. */
export interface ChatNamespace {
  /**
   * Issue a non-streaming chat completion request. The chosen `model`
   * literal determines which capability-gated fields (e.g. `tools`) are
   * allowed in the request type.
   */
  create<M extends ModelId>(
    req: ChatCompletionRequest<M>,
  ): Promise<Result<ChatCompletion, ApiError>>;
  /**
   * Issue a streaming chat completion request. The returned iterable yields
   * one `Result` per upstream SSE frame. A failed frame does not terminate
   * the iteration; an error frame from the server does. Same model-based
   * field gating applies as in `create`.
   */
  createStream<M extends ModelId>(
    req: ChatCompletionRequest<M>,
    opts?: StreamCallOptions,
  ): AsyncIterable<Result<ChatCompletionChunk, ApiError>>;
}

const isErrorFrame = (data: unknown): data is { readonly error: unknown } =>
  typeof data === "object" && data !== null && "error" in data;

const streamChunks = async function* (
  transport: Transport,
  req: ChatCompletionRequest,
  opts: StreamCallOptions | undefined,
): AsyncIterable<Result<ChatCompletionChunk, ApiError>> {
  const signal = opts?.signal;
  const streamResult = await transport.stream({
    method: "POST",
    path: "/v1/chat/completions",
    body: { ...req, stream: true },
    ...(signal !== undefined ? { signal } : {}),
  });
  if (!streamResult.ok) {
    yield err(streamResult.error);
    return;
  }
  const body = streamResult.value;
  try {
    for await (const event of parseSSE(body, signal !== undefined ? { signal } : undefined)) {
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
      yield ok(parsed.value as ChatCompletionChunk);
    }
  } finally {
    // `parseSSE` only releases the reader lock; the body still owns
    // unread bytes (anything after `[DONE]`). Cancel to free the connection.
    await body.cancel().catch(() => {});
  }
};

/** Bind a `ChatNamespace` to a constructed `Transport`. */
export const createChat = (transport: Transport): ChatNamespace => ({
  create(req) {
    return transport.request<ChatCompletion>({
      method: "POST",
      path: "/v1/chat/completions",
      body: req,
    });
  },
  createStream(req, opts) {
    return streamChunks(transport, req as ChatCompletionRequest, opts);
  },
});
