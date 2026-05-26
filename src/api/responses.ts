import type { ApiError } from "../error.ts";
import { httpError, streamError } from "../error.ts";
import type { ModelId } from "../models/mod.ts";
import type { Result } from "../result.ts";
import { err, ok, trySync } from "../result.ts";
import { parseSSE } from "../sse.ts";
import type { Transport } from "../transport.ts";

/** A single input item in a Responses API request. */
export interface ResponsesInputMessage {
  readonly role: "system" | "user" | "assistant" | "developer";
  readonly content: string | readonly ResponsesContentPart[];
}

/** A single content part inside a Responses API input message. */
export type ResponsesContentPart =
  | { readonly type: "input_text"; readonly text: string }
  | {
    readonly type: "input_image";
    readonly image_url: string;
    readonly detail?: "auto" | "low" | "high";
  }
  | { readonly type: "input_file"; readonly file_id: string }
  | { readonly type: "output_text"; readonly text: string };

/** Polymorphic input on a `responses.create` call. */
export type ResponsesInput = string | readonly ResponsesInputMessage[];

/** Tool descriptor accepted by `responses.create`. */
export type ResponsesTool =
  | {
    readonly type: "function";
    readonly name: string;
    readonly description?: string;
    readonly parameters?: Readonly<Record<string, unknown>>;
    readonly strict?: boolean;
  }
  | { readonly type: "web_search" }
  | { readonly type: "computer_use_preview" }
  | { readonly type: "file_search"; readonly vector_store_ids?: readonly string[] };

/** Strategy for forcing or restricting tool use on a Responses request. */
export type ResponsesToolChoice =
  | "none"
  | "auto"
  | "required"
  | { readonly type: "function"; readonly name: string };

/** Reasoning controls (only honored by reasoning models). */
export interface ResponsesReasoning {
  readonly effort?: "minimal" | "low" | "medium" | "high";
}

/** Request body for `POST /v1/responses`. */
export interface ResponsesCreateRequest {
  readonly model: ModelId;
  readonly input: ResponsesInput;
  readonly instructions?: string;
  /** Continue a previous response by chaining on its id. */
  readonly previous_response_id?: string;
  readonly tools?: readonly ResponsesTool[];
  readonly tool_choice?: ResponsesToolChoice;
  readonly reasoning?: ResponsesReasoning;
  readonly temperature?: number;
  readonly top_p?: number;
  readonly max_output_tokens?: number;
  /** Persist the response server-side for later retrieval. */
  readonly store?: boolean;
  readonly metadata?: Readonly<Record<string, string>>;
  /** Opaque caller identifier forwarded to upstream abuse-detection systems. */
  readonly user?: string;
  readonly stream?: boolean;
}

/** An output item produced by the model. */
export type ResponsesOutputItem =
  | {
    readonly type: "message";
    readonly id: string;
    readonly role: "assistant";
    readonly content: readonly ResponsesContentPart[];
    readonly status?: "in_progress" | "completed" | "incomplete";
  }
  | {
    readonly type: "function_call";
    readonly id: string;
    readonly call_id: string;
    readonly name: string;
    readonly arguments: string;
    readonly status?: "in_progress" | "completed";
  }
  | {
    readonly type: "web_search_call" | "file_search_call" | "computer_call";
    readonly id: string;
    readonly status?: "in_progress" | "completed" | "incomplete";
  }
  | {
    readonly type: "reasoning";
    readonly id: string;
    readonly summary?: readonly string[];
  };

/** Token usage on a `ResponsesResponse`. */
export interface ResponsesUsage {
  readonly input_tokens: number;
  readonly output_tokens: number;
  readonly total_tokens: number;
  readonly output_tokens_details?: { readonly reasoning_tokens: number };
}

/** A completed (non-streaming) response. */
export interface ResponsesResponse {
  readonly id: string;
  readonly object: "response";
  readonly created_at: number;
  readonly model: string;
  readonly status: "in_progress" | "completed" | "failed" | "incomplete";
  readonly output: readonly ResponsesOutputItem[];
  readonly previous_response_id?: string | null;
  readonly tools?: readonly ResponsesTool[];
  readonly tool_choice?: ResponsesToolChoice;
  readonly usage?: ResponsesUsage;
  readonly metadata?: Readonly<Record<string, string>>;
}

/** Lightweight wrapper around the streaming events emitted by `responses.createStream`. */
export type ResponsesStreamEvent =
  | { readonly type: "response.created"; readonly response: ResponsesResponse }
  | { readonly type: "response.in_progress"; readonly response: ResponsesResponse }
  | {
    readonly type: "response.output_text.delta";
    readonly item_id: string;
    readonly output_index: number;
    readonly delta: string;
  }
  | {
    readonly type: "response.output_text.done";
    readonly item_id: string;
    readonly output_index: number;
    readonly text: string;
  }
  | {
    readonly type:
      | "response.output_item.added"
      | "response.output_item.done"
      | "response.content_part.added"
      | "response.content_part.done";
    readonly item?: ResponsesOutputItem;
    readonly output_index?: number;
    readonly content_index?: number;
  }
  | { readonly type: "response.completed"; readonly response: ResponsesResponse }
  | { readonly type: "response.failed"; readonly response: ResponsesResponse }
  | { readonly type: "response.incomplete"; readonly response: ResponsesResponse }
  | {
    readonly type: "error";
    readonly error: { readonly type: string; readonly message: string };
  };

/** Query parameters for `GET /v1/responses`. */
export interface ListResponsesQuery {
  readonly after?: string;
  readonly limit?: number;
  readonly order?: "asc" | "desc";
}

/** Response from `GET /v1/responses`. */
export interface ListResponsesResponse {
  readonly object: "list";
  readonly data: readonly ResponsesResponse[];
  readonly first_id?: string;
  readonly last_id?: string;
  readonly has_more: boolean;
}

/** Response from `DELETE /v1/responses/{id}`. */
export interface DeleteResponseResponse {
  readonly id: string;
  readonly object: "response";
  readonly deleted: boolean;
}

/** Surface for the Responses endpoint on the `Client`. */
export interface ResponsesNamespace {
  /** Issue a non-streaming Responses request. */
  create(req: ResponsesCreateRequest): Promise<Result<ResponsesResponse, ApiError>>;
  /** Issue a streaming Responses request. Yields typed events. */
  createStream(
    req: ResponsesCreateRequest,
  ): AsyncIterable<Result<ResponsesStreamEvent, ApiError>>;
  /** Retrieve a stored response by id. */
  retrieve(responseId: string): Promise<Result<ResponsesResponse, ApiError>>;
  /** Cancel an in-progress response. */
  cancel(responseId: string): Promise<Result<ResponsesResponse, ApiError>>;
  /** List previously stored responses. */
  list(query?: ListResponsesQuery): Promise<Result<ListResponsesResponse, ApiError>>;
  /** Delete a stored response. */
  delete(responseId: string): Promise<Result<DeleteResponseResponse, ApiError>>;
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

const isErrorFrame = (data: unknown): data is { readonly error: unknown } =>
  typeof data === "object" && data !== null && "error" in data &&
  (data as { type?: unknown }).type !== "error";

const streamEvents = async function* (
  transport: Transport,
  req: ResponsesCreateRequest,
): AsyncIterable<Result<ResponsesStreamEvent, ApiError>> {
  const streamResult = await transport.stream({
    method: "POST",
    path: "/v1/responses",
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
    yield ok(parsed.value as ResponsesStreamEvent);
  }
};

/** Bind a `ResponsesNamespace` to a constructed `Transport`. */
export const createResponses = (transport: Transport): ResponsesNamespace => ({
  create(req) {
    return transport.request<ResponsesResponse>({
      method: "POST",
      path: "/v1/responses",
      body: req,
    });
  },
  createStream(req) {
    return streamEvents(transport, req);
  },
  retrieve(responseId) {
    return transport.request<ResponsesResponse>({
      method: "GET",
      path: `/v1/responses/${encodeURIComponent(responseId)}`,
    });
  },
  cancel(responseId) {
    return transport.request<ResponsesResponse>({
      method: "POST",
      path: `/v1/responses/${encodeURIComponent(responseId)}/cancel`,
    });
  },
  list(query) {
    return transport.request<ListResponsesResponse>({
      method: "GET",
      path: "/v1/responses",
      ...(query === undefined ? {} : { query: filterUndefined(query) }),
    });
  },
  delete(responseId) {
    return transport.request<DeleteResponseResponse>({
      method: "DELETE",
      path: `/v1/responses/${encodeURIComponent(responseId)}`,
    });
  },
});
