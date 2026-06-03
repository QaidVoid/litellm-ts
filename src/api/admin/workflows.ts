import type { ApiError } from "../../error.ts";
import type { Result } from "../../result.ts";
import type { Transport } from "../../transport.ts";

/** Lifecycle status of a workflow run. */
export type WorkflowRunStatus =
  | "pending"
  | "running"
  | "paused"
  | "completed"
  | "failed";

/** Request body for `POST /v1/workflows/runs`. */
export interface CreateWorkflowRunRequest {
  /** Workflow kind being launched. */
  readonly workflow_type: string;
  /** Optional input bundle passed to the workflow. */
  readonly input?: Readonly<Record<string, unknown>>;
  /** Free-form metadata. */
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/** Request body for `PATCH /v1/workflows/runs/{id}`. */
export interface UpdateWorkflowRunRequest {
  /** New lifecycle status. */
  readonly status?: WorkflowRunStatus;
  /** Final or partial output bundle. */
  readonly output?: Readonly<Record<string, unknown>>;
  /** Replace the metadata bag. */
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/** Request body for `POST /v1/workflows/runs/{id}/events`. */
export interface CreateWorkflowEventRequest {
  /** Event discriminator, e.g. `"step_started"`, `"step_completed"`. */
  readonly event_type: string;
  /** Step the event belongs to. */
  readonly step_name: string;
  /** Optional structured payload. */
  readonly data?: Readonly<Record<string, unknown>>;
}

/** Request body for `POST /v1/workflows/runs/{id}/messages`. */
export interface CreateWorkflowMessageRequest {
  /** Author role, e.g. `"user"`, `"assistant"`. */
  readonly role: string;
  /** Message text. */
  readonly content: string;
  /** Conversation session id. */
  readonly session_id?: string;
}

/** A workflow run record returned by create / get. */
export interface WorkflowRun {
  /** Run id. */
  readonly run_id: string;
  /** Owning user id. */
  readonly user_id?: string;
  /** Workflow kind. */
  readonly workflow_type: string;
  /** Lifecycle status. */
  readonly status: WorkflowRunStatus;
  /** Input bundle. */
  readonly input?: Readonly<Record<string, unknown>>;
  /** Output bundle, when present. */
  readonly output?: Readonly<Record<string, unknown>>;
  /** Free-form metadata. */
  readonly metadata?: Readonly<Record<string, unknown>>;
  /** ISO-8601 creation timestamp. */
  readonly created_at?: string;
  /** ISO-8601 last-update timestamp. */
  readonly updated_at?: string;
}

/** A workflow event row. */
export interface WorkflowEvent {
  /** Event id. */
  readonly id?: string;
  /** Owning run id. */
  readonly run_id: string;
  /** Sequence number within the run. */
  readonly sequence_number: number;
  /** Event discriminator. */
  readonly event_type: string;
  /** Step the event belongs to. */
  readonly step_name: string;
  /** Optional structured payload. */
  readonly data?: Readonly<Record<string, unknown>>;
  /** ISO-8601 creation timestamp. */
  readonly created_at?: string;
}

/** A workflow message row. */
export interface WorkflowMessage {
  /** Message id. */
  readonly id?: string;
  /** Owning run id. */
  readonly run_id: string;
  /** Sequence number within the run. */
  readonly sequence_number: number;
  /** Author role. */
  readonly role: string;
  /** Message text. */
  readonly content: string;
  /** Conversation session id. */
  readonly session_id?: string;
  /** ISO-8601 creation timestamp. */
  readonly created_at?: string;
}

/** Query parameters for `GET /v1/workflows/runs`. */
export interface ListWorkflowRunsQuery {
  /** Filter by workflow kind. */
  readonly workflow_type?: string;
  /** Filter by lifecycle status. */
  readonly status?: WorkflowRunStatus;
  /** Maximum records per page. */
  readonly limit?: number;
}

/** Response from `GET /v1/workflows/runs`. */
export interface ListWorkflowRunsResponse {
  /** Returned runs. */
  readonly runs: readonly WorkflowRun[];
  /** Total run count matching the filter. */
  readonly total?: number;
}

/** Query parameters for `GET /v1/workflows/runs/{id}/events`. */
export interface ListWorkflowEventsQuery {
  /** Maximum events per page (1..500). */
  readonly limit?: number;
}

/** Response from `GET /v1/workflows/runs/{id}/events`. */
export interface ListWorkflowEventsResponse {
  /** Returned events. */
  readonly events: readonly WorkflowEvent[];
}

/** Query parameters for `GET /v1/workflows/runs/{id}/messages`. */
export interface ListWorkflowMessagesQuery {
  /** Maximum messages per page (1..500). */
  readonly limit?: number;
}

/** Response from `GET /v1/workflows/runs/{id}/messages`. */
export interface ListWorkflowMessagesResponse {
  /** Returned messages. */
  readonly messages: readonly WorkflowMessage[];
}

/** Surface for workflow-run administration on the `Client`. */
export interface WorkflowsNamespace {
  /** Create a new workflow run. */
  create(req: CreateWorkflowRunRequest): Promise<Result<WorkflowRun, ApiError>>;
  /** List workflow runs. */
  list(query?: ListWorkflowRunsQuery): Promise<Result<ListWorkflowRunsResponse, ApiError>>;
  /** Retrieve a single workflow run by id. */
  get(runId: string): Promise<Result<WorkflowRun, ApiError>>;
  /** Apply a partial update to a workflow run. */
  update(runId: string, req: UpdateWorkflowRunRequest): Promise<Result<WorkflowRun, ApiError>>;
  /** Append an event to a workflow run. */
  appendEvent(
    runId: string,
    req: CreateWorkflowEventRequest,
  ): Promise<Result<WorkflowEvent, ApiError>>;
  /** List events on a workflow run (newest last). */
  listEvents(
    runId: string,
    query?: ListWorkflowEventsQuery,
  ): Promise<Result<ListWorkflowEventsResponse, ApiError>>;
  /** Append a message to a workflow run. */
  appendMessage(
    runId: string,
    req: CreateWorkflowMessageRequest,
  ): Promise<Result<WorkflowMessage, ApiError>>;
  /** List messages on a workflow run (newest last). */
  listMessages(
    runId: string,
    query?: ListWorkflowMessagesQuery,
  ): Promise<Result<ListWorkflowMessagesResponse, ApiError>>;
}

const encode = (s: string) => encodeURIComponent(s);

/** Bind a `WorkflowsNamespace` to a constructed `Transport`. */
export const createWorkflows = (transport: Transport): WorkflowsNamespace => ({
  create(req) {
    return transport.request<WorkflowRun>({
      method: "POST",
      path: "/v1/workflows/runs",
      body: req,
    });
  },
  list(query) {
    return transport.request<ListWorkflowRunsResponse>({
      method: "GET",
      path: "/v1/workflows/runs",
      ...(query === undefined ? {} : { query }),
    });
  },
  get(runId) {
    return transport.request<WorkflowRun>({
      method: "GET",
      path: `/v1/workflows/runs/${encode(runId)}`,
    });
  },
  update(runId, req) {
    return transport.request<WorkflowRun>({
      method: "PATCH",
      path: `/v1/workflows/runs/${encode(runId)}`,
      body: req,
    });
  },
  appendEvent(runId, req) {
    return transport.request<WorkflowEvent>({
      method: "POST",
      path: `/v1/workflows/runs/${encode(runId)}/events`,
      body: req,
    });
  },
  listEvents(runId, query) {
    return transport.request<ListWorkflowEventsResponse>({
      method: "GET",
      path: `/v1/workflows/runs/${encode(runId)}/events`,
      ...(query === undefined ? {} : { query }),
    });
  },
  appendMessage(runId, req) {
    return transport.request<WorkflowMessage>({
      method: "POST",
      path: `/v1/workflows/runs/${encode(runId)}/messages`,
      body: req,
    });
  },
  listMessages(runId, query) {
    return transport.request<ListWorkflowMessagesResponse>({
      method: "GET",
      path: `/v1/workflows/runs/${encode(runId)}/messages`,
      ...(query === undefined ? {} : { query }),
    });
  },
});
