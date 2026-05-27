import type { ApiError } from "../error.ts";
import { httpError, streamError } from "../error.ts";
import type { ModelId } from "../models/mod.ts";
import type { Result } from "../result.ts";
import { err, ok, trySync } from "../result.ts";
import { parseSSE } from "../sse.ts";
import type { Transport } from "../transport.ts";

/** A single input item in a Responses API request. */
export interface ResponsesInputMessage {
  /** Speaker role for this message. */
  readonly role: "system" | "user" | "assistant" | "developer";
  /** Message content; plain text or an ordered array of content parts. */
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
  /** How much reasoning effort the model should spend. */
  readonly effort?: "minimal" | "low" | "medium" | "high";
}

/** Request body for `POST /v1/responses`. */
export interface ResponsesCreateRequest {
  /** Model id to run the response against. */
  readonly model: ModelId;
  /** Input prompt; string or structured input messages. */
  readonly input: ResponsesInput;
  /** Top-level instructions for the model. */
  readonly instructions?: string;
  /** Continue a previous response by chaining on its id. */
  readonly previous_response_id?: string;
  /** Tools the model may invoke. */
  readonly tools?: readonly ResponsesTool[];
  /** Tool-call routing strategy. */
  readonly tool_choice?: ResponsesToolChoice;
  /** Reasoning controls for reasoning models. */
  readonly reasoning?: ResponsesReasoning;
  /** Sampling temperature. */
  readonly temperature?: number;
  /** Nucleus sampling cutoff. */
  readonly top_p?: number;
  /** Maximum tokens the model may produce. */
  readonly max_output_tokens?: number;
  /** Persist the response server-side for later retrieval. */
  readonly store?: boolean;
  /** Free-form metadata attached to the stored response. */
  readonly metadata?: Readonly<Record<string, string>>;
  /** Opaque caller identifier forwarded to upstream abuse-detection systems. */
  readonly user?: string;
  /** Stream the response as SSE events. */
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
  /** Tokens consumed by the input. */
  readonly input_tokens: number;
  /** Tokens produced in the output. */
  readonly output_tokens: number;
  /** Sum of input and output tokens. */
  readonly total_tokens: number;
  /** Breakdown of the output token total. */
  readonly output_tokens_details?: { readonly reasoning_tokens: number };
}

/** A completed (non-streaming) response. */
export interface ResponsesResponse {
  /** Server-assigned id. */
  readonly id: string;
  /** Discriminator, always `"response"`. */
  readonly object: "response";
  /** Unix epoch seconds when the response was created. */
  readonly created_at: number;
  /** Model that produced the response. */
  readonly model: string;
  /** Lifecycle status. */
  readonly status: "in_progress" | "completed" | "failed" | "incomplete";
  /** Output items produced by the model, in order. */
  readonly output: readonly ResponsesOutputItem[];
  /** Id of the response this one chains from. */
  readonly previous_response_id?: string | null;
  /** Tools that were available to the model. */
  readonly tools?: readonly ResponsesTool[];
  /** Tool-call routing strategy applied. */
  readonly tool_choice?: ResponsesToolChoice;
  /** Token accounting. */
  readonly usage?: ResponsesUsage;
  /** Free-form metadata stored with the response. */
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
  /** Cursor: return responses after this id. */
  readonly after?: string;
  /** Maximum records per page. */
  readonly limit?: number;
  /** Sort direction. */
  readonly order?: "asc" | "desc";
}

/** Response from `GET /v1/responses`. */
export interface ListResponsesResponse {
  /** Discriminator, always `"list"`. */
  readonly object: "list";
  /** Responses on the current page. */
  readonly data: readonly ResponsesResponse[];
  /** Id of the first record on the page. */
  readonly first_id?: string;
  /** Id of the last record on the page. */
  readonly last_id?: string;
  /** True when more pages remain. */
  readonly has_more: boolean;
}

/** Response from `DELETE /v1/responses/{id}`. */
export interface DeleteResponseResponse {
  /** Id of the deleted response. */
  readonly id: string;
  /** Discriminator, always `"response"`. */
  readonly object: "response";
  /** True when the delete succeeded. */
  readonly deleted: boolean;
}

/** Query parameters for `GET /v1/responses/{id}/input_items`. */
export interface ListResponseInputItemsQuery {
  /** Cursor: return items after this id. */
  readonly after?: string;
  /** Cursor: return items before this id. */
  readonly before?: string;
  /** Page size. */
  readonly limit?: number;
  /** Sort direction. */
  readonly order?: "asc" | "desc";
  /** Include extra fields on each item (provider-specific). */
  readonly include?: readonly string[];
}

/** A single input item attached to a stored response. */
export interface ResponseInputItem {
  /** Server-assigned id. */
  readonly id: string;
  /** Item kind (e.g. `"message"`, `"function_call"`). */
  readonly type: string;
  /** Speaker role when the item is a message. */
  readonly role?: string;
  /** Item content; shape varies by `type`. */
  readonly content?: unknown;
  /** Additional fields the proxy may surface. */
  readonly [key: string]: unknown;
}

/** Response from `GET /v1/responses/{id}/input_items`. */
export interface ListResponseInputItemsResponse {
  /** Discriminator, always `"list"`. */
  readonly object: "list";
  /** Returned input items. */
  readonly data: readonly ResponseInputItem[];
  /** Id of the first record on the page. */
  readonly first_id?: string;
  /** Id of the last record on the page. */
  readonly last_id?: string;
  /** True when more pages remain. */
  readonly has_more: boolean;
}

/** Request body for `POST /v1/responses/compact`. */
export interface ResponsesCompactRequest {
  /** Model id used for the compaction pass. */
  readonly model: ModelId;
  /** Conversation to compact; same shape as `ResponsesCreateRequest.input`. */
  readonly input: ResponsesInput;
  /** Optional instructions guiding the compaction. */
  readonly instructions?: string;
  /** Free-form metadata stored with the compaction result. */
  readonly metadata?: Readonly<Record<string, string>>;
  /** Additional provider-specific fields. */
  readonly [key: string]: unknown;
}

/** Response from `POST /v1/responses/compact`. */
export interface ResponsesCompactResponse {
  /** Discriminator, always `"response.compaction"`. */
  readonly object?: string;
  /** Server-assigned id for the compaction artifact. */
  readonly id?: string;
  /** Opaque, encrypted items the caller can substitute back into the input list. */
  readonly items?: readonly Readonly<Record<string, unknown>>[];
  /** Additional provider-specific fields. */
  readonly [key: string]: unknown;
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
  /** List input items recorded for a stored response. */
  listInputItems(
    responseId: string,
    query?: ListResponseInputItemsQuery,
  ): Promise<Result<ListResponseInputItemsResponse, ApiError>>;
  /** Run a compaction pass over a conversation, returning opaque compacted items. */
  compact(req: ResponsesCompactRequest): Promise<Result<ResponsesCompactResponse, ApiError>>;
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
  const body = streamResult.value;
  try {
    for await (const event of parseSSE(body)) {
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
  } finally {
    await body.cancel().catch(() => {});
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
  listInputItems(responseId, query) {
    return transport.request<ListResponseInputItemsResponse>({
      method: "GET",
      path: `/v1/responses/${encodeURIComponent(responseId)}/input_items`,
      ...(query === undefined ? {} : {
        query: (() => {
          const out: Record<string, string | number | boolean | readonly string[]> = {};
          for (const [k, v] of Object.entries(query)) {
            if (v !== undefined) {
              out[k] = v as string | number | boolean | readonly string[];
            }
          }
          return out;
        })(),
      }),
    });
  },
  compact(req) {
    return transport.request<ResponsesCompactResponse>({
      method: "POST",
      path: "/v1/responses/compact",
      body: req,
    });
  },
  delete(responseId) {
    return transport.request<DeleteResponseResponse>({
      method: "DELETE",
      path: `/v1/responses/${encodeURIComponent(responseId)}`,
    });
  },
});
