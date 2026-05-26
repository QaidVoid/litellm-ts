import type { ApiError } from "../error.ts";
import type { ModelId } from "../models/mod.ts";
import type { Result } from "../result.ts";
import type { Transport } from "../transport.ts";

/** A single message in a chat completion request. Discriminated by `role`. */
export type ChatMessage =
  | ChatSystemMessage
  | ChatUserMessage
  | ChatAssistantMessage
  | ChatToolMessage;

/** A system instruction message. */
export interface ChatSystemMessage {
  readonly role: "system";
  readonly content: string;
  readonly name?: string;
}

/** A user-authored message. `content` may be a string or a multi-part array. */
export interface ChatUserMessage {
  readonly role: "user";
  readonly content: string | readonly ChatUserContentPart[];
  readonly name?: string;
}

/**
 * A model-authored message echoed back in conversation history. May carry
 * tool calls instead of text content.
 */
export interface ChatAssistantMessage {
  readonly role: "assistant";
  readonly content: string | null;
  readonly name?: string;
  readonly tool_calls?: readonly ChatToolCall[];
}

/** Output of a tool invocation, referenced by `tool_call_id`. */
export interface ChatToolMessage {
  readonly role: "tool";
  readonly tool_call_id: string;
  readonly content: string;
}

/** A single content part inside a user message with multi-modal input. */
export type ChatUserContentPart = ChatTextPart | ChatImageUrlPart;

export interface ChatTextPart {
  readonly type: "text";
  readonly text: string;
}

export interface ChatImageUrlPart {
  readonly type: "image_url";
  readonly image_url: {
    readonly url: string;
    readonly detail?: "auto" | "low" | "high";
  };
}

/** A tool the model may invoke. Only function-type tools are supported in v0.1. */
export interface ChatTool {
  readonly type: "function";
  readonly function: {
    readonly name: string;
    readonly description?: string;
    readonly parameters?: Readonly<Record<string, unknown>>;
  };
}

/** A tool call emitted by the model. `arguments` is a JSON-encoded string. */
export interface ChatToolCall {
  readonly id: string;
  readonly type: "function";
  readonly function: {
    readonly name: string;
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

/** A chat completion request body. Field names match the OpenAI-compatible wire format. */
export interface ChatCompletionRequest {
  readonly model: ModelId;
  readonly messages: readonly ChatMessage[];
  readonly temperature?: number;
  readonly top_p?: number;
  readonly max_tokens?: number;
  readonly max_completion_tokens?: number;
  readonly n?: number;
  readonly stop?: string | readonly string[];
  readonly presence_penalty?: number;
  readonly frequency_penalty?: number;
  readonly user?: string;
  readonly tools?: readonly ChatTool[];
  readonly tool_choice?: ChatToolChoice;
  readonly response_format?: ChatResponseFormat;
  readonly seed?: number;
  readonly parallel_tool_calls?: boolean;
}

/** Why the model stopped producing tokens. */
export type ChatFinishReason =
  | "stop"
  | "length"
  | "tool_calls"
  | "content_filter"
  | "function_call";

/** A single completion candidate in the response. */
export interface ChatChoice {
  readonly index: number;
  readonly message: {
    readonly role: "assistant";
    readonly content: string | null;
    readonly tool_calls?: readonly ChatToolCall[];
  };
  readonly finish_reason: ChatFinishReason | null;
}

/** Token usage reported by the upstream provider. */
export interface ChatUsage {
  readonly prompt_tokens: number;
  readonly completion_tokens: number;
  readonly total_tokens: number;
}

/** A completed (non-streaming) chat completion response. */
export interface ChatCompletion {
  readonly id: string;
  readonly object: "chat.completion";
  readonly created: number;
  readonly model: string;
  readonly choices: readonly ChatChoice[];
  readonly usage?: ChatUsage;
}

/** Surface for chat endpoints on the `Client`. */
export interface ChatNamespace {
  /** Issue a non-streaming chat completion request. */
  create(req: ChatCompletionRequest): Promise<Result<ChatCompletion, ApiError>>;
}

/** Bind a `ChatNamespace` to a constructed `Transport`. */
export const createChat = (transport: Transport): ChatNamespace => ({
  create(req) {
    return transport.request<ChatCompletion>({
      method: "POST",
      path: "/v1/chat/completions",
      body: req,
    });
  },
});
