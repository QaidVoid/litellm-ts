import type { ApiError } from "../error.ts";
import type { Result } from "../result.ts";
import type { Transport } from "../transport.ts";

/** Function-tool exposed to an assistant. */
export interface AssistantTool {
  /** Tool discriminator, e.g. `"code_interpreter"`, `"file_search"`, `"function"`. */
  readonly type: string;
  /** Tool-specific configuration. Function tools carry a JSON Schema here. */
  readonly [key: string]: unknown;
}

/** Request body for `POST /v1/assistants`. */
export interface CreateAssistantRequest {
  /** Model the assistant runs on. */
  readonly model: string;
  /** Display name shown in the OpenAI console. */
  readonly name?: string;
  /** Short description. */
  readonly description?: string;
  /** System instructions the assistant follows. */
  readonly instructions?: string;
  /** Tools the assistant is allowed to call. */
  readonly tools?: readonly AssistantTool[];
  /** File ids attached to the assistant. */
  readonly file_ids?: readonly string[];
  /** Free-form metadata (string-keyed). */
  readonly metadata?: Readonly<Record<string, string>>;
  /** Sampling temperature. */
  readonly temperature?: number;
  /** Nucleus sampling cutoff. */
  readonly top_p?: number;
  /** Response format constraint. */
  readonly response_format?: Readonly<Record<string, unknown>> | "auto";
}

/** A single assistant record. */
export interface Assistant {
  /** Server-assigned id. */
  readonly id: string;
  /** Discriminator, always `"assistant"`. */
  readonly object: "assistant";
  /** Unix epoch seconds when the assistant was created. */
  readonly created_at: number;
  /** Display name. */
  readonly name?: string;
  /** Short description. */
  readonly description?: string;
  /** Backing model. */
  readonly model: string;
  /** System instructions. */
  readonly instructions?: string;
  /** Configured tools. */
  readonly tools?: readonly AssistantTool[];
  /** File attachments. */
  readonly file_ids?: readonly string[];
  /** Free-form metadata. */
  readonly metadata?: Readonly<Record<string, string>>;
}

/** Response from `DELETE /v1/assistants/{id}`. */
export interface DeleteAssistantResponse {
  /** Id of the deleted assistant. */
  readonly id: string;
  /** Discriminator, always `"assistant.deleted"`. */
  readonly object: "assistant.deleted";
  /** True when the delete succeeded. */
  readonly deleted: boolean;
}

/** Query parameters for `GET /v1/assistants`. */
export interface ListAssistantsQuery {
  /** Maximum records per page. */
  readonly limit?: number;
  /** Sort direction. */
  readonly order?: "asc" | "desc";
  /** Cursor: return records after this id. */
  readonly after?: string;
  /** Cursor: return records before this id. */
  readonly before?: string;
}

/** Generic OpenAI list-response envelope. */
export interface ListResponse<T> {
  /** Discriminator, always `"list"`. */
  readonly object: "list";
  /** Returned records. */
  readonly data: readonly T[];
  /** First record id on the page. */
  readonly first_id?: string;
  /** Last record id on the page. */
  readonly last_id?: string;
  /** True when more pages remain. */
  readonly has_more: boolean;
}

/** A single thread message. */
export interface ThreadMessage {
  /** Server-assigned id. */
  readonly id: string;
  /** Discriminator, always `"thread.message"`. */
  readonly object: "thread.message";
  /** Unix epoch seconds when the message was created. */
  readonly created_at: number;
  /** Owning thread id. */
  readonly thread_id: string;
  /** Author role. */
  readonly role: "user" | "assistant";
  /** Multi-part content blocks. */
  readonly content: readonly Readonly<Record<string, unknown>>[];
  /** Owning assistant id when the message was authored by a run. */
  readonly assistant_id?: string;
  /** Run id that produced the message. */
  readonly run_id?: string;
  /** File attachments. */
  readonly file_ids?: readonly string[];
  /** Free-form metadata. */
  readonly metadata?: Readonly<Record<string, string>>;
}

/** Request body for `POST /v1/threads/{id}/messages`. */
export interface CreateThreadMessageRequest {
  /** Author role; always `"user"` from clients. */
  readonly role: "user";
  /** Plain text or a multi-part content array. */
  readonly content: string | readonly Readonly<Record<string, unknown>>[];
  /** File ids referenced by the message. */
  readonly file_ids?: readonly string[];
  /** Free-form metadata. */
  readonly metadata?: Readonly<Record<string, string>>;
}

/** Initial message seed for `POST /v1/threads`. */
export interface ThreadInitialMessage {
  readonly role: "user";
  readonly content: string | readonly Readonly<Record<string, unknown>>[];
  readonly file_ids?: readonly string[];
  readonly metadata?: Readonly<Record<string, string>>;
}

/** Request body for `POST /v1/threads`. */
export interface CreateThreadRequest {
  /** Optional initial messages. */
  readonly messages?: readonly ThreadInitialMessage[];
  /** Free-form metadata. */
  readonly metadata?: Readonly<Record<string, string>>;
}

/** A single thread record. */
export interface Thread {
  /** Server-assigned id. */
  readonly id: string;
  /** Discriminator, always `"thread"`. */
  readonly object: "thread";
  /** Unix epoch seconds when the thread was created. */
  readonly created_at: number;
  /** Free-form metadata. */
  readonly metadata?: Readonly<Record<string, string>>;
}

/** Query parameters for `GET /v1/threads/{id}/messages`. */
export interface ListThreadMessagesQuery {
  readonly limit?: number;
  readonly order?: "asc" | "desc";
  readonly after?: string;
  readonly before?: string;
}

/** Request body for `POST /v1/threads/{id}/runs`. */
export interface CreateRunRequest {
  /** Assistant the run targets. */
  readonly assistant_id: string;
  /** Override the assistant's default model for this run. */
  readonly model?: string;
  /** Override the assistant's default instructions for this run. */
  readonly instructions?: string;
  /** Append additional instructions to the assistant's defaults. */
  readonly additional_instructions?: string;
  /** Override the assistant's tool list for this run. */
  readonly tools?: readonly AssistantTool[];
  /** Free-form metadata. */
  readonly metadata?: Readonly<Record<string, string>>;
  /** Sampling temperature. */
  readonly temperature?: number;
}

/** A single run record. */
export interface Run {
  /** Server-assigned id. */
  readonly id: string;
  /** Discriminator, always `"thread.run"`. */
  readonly object: "thread.run";
  /** Unix epoch seconds when the run was created. */
  readonly created_at: number;
  /** Owning thread id. */
  readonly thread_id: string;
  /** Targeted assistant id. */
  readonly assistant_id: string;
  /** Lifecycle status. */
  readonly status:
    | "queued"
    | "in_progress"
    | "requires_action"
    | "cancelling"
    | "cancelled"
    | "failed"
    | "completed"
    | "expired";
  /** Required action (e.g. tool outputs) when `status === "requires_action"`. */
  readonly required_action?: Readonly<Record<string, unknown>>;
  /** Last error, when the run failed. */
  readonly last_error?: Readonly<Record<string, unknown>>;
  /** Model used for the run. */
  readonly model?: string;
  /** Effective instructions. */
  readonly instructions?: string;
  /** Effective tool list. */
  readonly tools?: readonly AssistantTool[];
  /** File attachments. */
  readonly file_ids?: readonly string[];
  /** Free-form metadata. */
  readonly metadata?: Readonly<Record<string, string>>;
}

/** Surface for the OpenAI Assistants API on the `Client`. */
export interface AssistantsNamespace {
  /** List assistants. */
  list(query?: ListAssistantsQuery): Promise<Result<ListResponse<Assistant>, ApiError>>;
  /** Create an assistant. */
  create(req: CreateAssistantRequest): Promise<Result<Assistant, ApiError>>;
  /** Delete an assistant by id. */
  delete(assistantId: string): Promise<Result<DeleteAssistantResponse, ApiError>>;
}

/** Messages sub-namespace under `client.threads.messages`. */
export interface ThreadMessagesNamespace {
  /** List messages on a thread. */
  list(
    threadId: string,
    query?: ListThreadMessagesQuery,
  ): Promise<Result<ListResponse<ThreadMessage>, ApiError>>;
  /** Append a user message to a thread. */
  create(
    threadId: string,
    req: CreateThreadMessageRequest,
  ): Promise<Result<ThreadMessage, ApiError>>;
}

/** Runs sub-namespace under `client.threads.runs`. */
export interface ThreadRunsNamespace {
  /** Start a new run against an assistant on the given thread. */
  create(threadId: string, req: CreateRunRequest): Promise<Result<Run, ApiError>>;
}

/** Surface for the OpenAI Threads API on the `Client`. */
export interface ThreadsNamespace {
  /** Create a new thread. */
  create(req?: CreateThreadRequest): Promise<Result<Thread, ApiError>>;
  /** Retrieve a thread by id. */
  retrieve(threadId: string): Promise<Result<Thread, ApiError>>;
  /** Per-thread message sub-namespace. */
  readonly messages: ThreadMessagesNamespace;
  /** Per-thread run sub-namespace. */
  readonly runs: ThreadRunsNamespace;
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

const createMessages = (transport: Transport): ThreadMessagesNamespace => ({
  list(threadId, query) {
    return transport.request<ListResponse<ThreadMessage>>({
      method: "GET",
      path: `/v1/threads/${encode(threadId)}/messages`,
      ...(query === undefined ? {} : { query: filterUndefined(query) }),
    });
  },
  create(threadId, req) {
    return transport.request<ThreadMessage>({
      method: "POST",
      path: `/v1/threads/${encode(threadId)}/messages`,
      body: req,
    });
  },
});

const createRuns = (transport: Transport): ThreadRunsNamespace => ({
  create(threadId, req) {
    return transport.request<Run>({
      method: "POST",
      path: `/v1/threads/${encode(threadId)}/runs`,
      body: req,
    });
  },
});

/** Bind an `AssistantsNamespace` to a constructed `Transport`. */
export const createAssistants = (transport: Transport): AssistantsNamespace => ({
  list(query) {
    return transport.request<ListResponse<Assistant>>({
      method: "GET",
      path: "/v1/assistants",
      ...(query === undefined ? {} : { query: filterUndefined(query) }),
    });
  },
  create(req) {
    return transport.request<Assistant>({
      method: "POST",
      path: "/v1/assistants",
      body: req,
    });
  },
  delete(assistantId) {
    return transport.request<DeleteAssistantResponse>({
      method: "DELETE",
      path: `/v1/assistants/${encode(assistantId)}`,
    });
  },
});

/** Bind a `ThreadsNamespace` to a constructed `Transport`. */
export const createThreads = (transport: Transport): ThreadsNamespace => ({
  create(req) {
    return transport.request<Thread>({
      method: "POST",
      path: "/v1/threads",
      body: req ?? {},
    });
  },
  retrieve(threadId) {
    return transport.request<Thread>({
      method: "GET",
      path: `/v1/threads/${encode(threadId)}`,
    });
  },
  messages: createMessages(transport),
  runs: createRuns(transport),
});
