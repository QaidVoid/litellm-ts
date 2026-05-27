import type { ApiError } from "../error.ts";
import { streamError } from "../error.ts";
import type { ModelId } from "../models/mod.ts";
import type { Result } from "../result.ts";
import { err, ok, trySync } from "../result.ts";
import { parseSSE } from "../sse.ts";
import type { Transport } from "../transport.ts";

/** Request body for `:generateContent` and `:streamGenerateContent`. */
export interface GenerateContentRequest {
  /** Conversation turns (Google GenAI shape). */
  readonly contents: readonly Readonly<Record<string, unknown>>[];
  /** System-instruction content block. */
  readonly system_instruction?: Readonly<Record<string, unknown>>;
  /** Sampling and decoding parameters. */
  readonly generation_config?: Readonly<Record<string, unknown>>;
  /** Safety filter overrides. */
  readonly safety_settings?: readonly Readonly<Record<string, unknown>>[];
  /** Tool definitions exposed to the model. */
  readonly tools?: readonly Readonly<Record<string, unknown>>[];
  /** Tool-call routing strategy. */
  readonly tool_config?: Readonly<Record<string, unknown>>;
  /** Provider-specific extras forwarded as-is. */
  readonly [key: string]: unknown;
}

/** Response from `:generateContent`. Untyped passthrough of Google's shape. */
export type GenerateContentResponse = Readonly<Record<string, unknown>>;

/** Single SSE chunk from `:streamGenerateContent`. */
export type GenerateContentChunk = Readonly<Record<string, unknown>>;

/** Request body for `:countTokens`. */
export interface CountTokensRequest {
  readonly contents: readonly Readonly<Record<string, unknown>>[];
  readonly system_instruction?: Readonly<Record<string, unknown>>;
  readonly tools?: readonly Readonly<Record<string, unknown>>[];
  readonly [key: string]: unknown;
}

/** Response from `:countTokens`. */
export interface CountTokensResponse {
  readonly totalTokens?: number;
  readonly cachedContentTokenCount?: number;
  readonly [key: string]: unknown;
}

/** Request body for `POST /v1beta/agents` (Gemini-side agent creation). */
export interface GoogleAgentCreateRequest {
  /** User-supplied agent id (becomes `name` on the response). */
  readonly id: string;
  /** Base agent the new agent is derived from. */
  readonly base_agent?: string;
  /** System instructions baked into the agent. */
  readonly system_instruction?: string;
  /** Base environment configuration. */
  readonly base_environment?: Readonly<Record<string, unknown>>;
  /** Provider-specific extras. */
  readonly [key: string]: unknown;
}

/** Response from `/v1beta/agents` creation or retrieval. */
export interface GoogleAgent {
  readonly id?: string;
  readonly name?: string;
  /** Provider-specific extras. */
  readonly [key: string]: unknown;
}

/** Query parameters for `GET /v1beta/agents`. */
export interface ListGoogleAgentsQuery {
  readonly page_size?: number;
  readonly page_token?: string;
}

/** Response from `GET /v1beta/agents`. */
export interface ListGoogleAgentsResponse {
  readonly agents: readonly Readonly<Record<string, unknown>>[];
  readonly next_page_token?: string;
}

/** Response from `DELETE /v1beta/agents/{name}`. */
export interface DeleteGoogleAgentResponse {
  readonly name: string;
  readonly deleted: boolean;
}

/** Response from `GET /v1beta/agents/{name}/versions`. */
export interface ListAgentVersionsResponse {
  readonly agent_versions: readonly Readonly<Record<string, unknown>>[];
  readonly next_page_token?: string;
}

/** Request body for `POST /v1beta/interactions`. */
export type CreateInteractionRequest = Readonly<Record<string, unknown>>;

/** Response from `POST /v1beta/interactions`. */
export type Interaction = Readonly<Record<string, unknown>>;

/** Agents sub-namespace under `client.googleGenai.agents`. */
export interface GoogleAgentsNamespace {
  /** Create a new agent on the provider side (e.g. Gemini). */
  create(req: GoogleAgentCreateRequest): Promise<Result<GoogleAgent, ApiError>>;
  /** List agents. */
  list(query?: ListGoogleAgentsQuery): Promise<Result<ListGoogleAgentsResponse, ApiError>>;
  /** Retrieve an agent by name. */
  get(name: string): Promise<Result<GoogleAgent, ApiError>>;
  /** Delete an agent by name. */
  delete(name: string): Promise<Result<DeleteGoogleAgentResponse, ApiError>>;
  /** List versions for an agent. */
  versions(name: string): Promise<Result<ListAgentVersionsResponse, ApiError>>;
}

/** Interactions sub-namespace under `client.googleGenai.interactions`. */
export interface GoogleInteractionsNamespace {
  /** Create a new interaction (multi-turn conversation handle). */
  create(req: CreateInteractionRequest): Promise<Result<Interaction, ApiError>>;
  /** Retrieve an interaction. */
  get(interactionId: string): Promise<Result<Interaction, ApiError>>;
  /** Cancel an in-progress interaction. */
  cancel(interactionId: string): Promise<Result<unknown, ApiError>>;
  /** Delete an interaction. */
  delete(interactionId: string): Promise<Result<unknown, ApiError>>;
}

/** Surface for the native Google GenAI shape on the `Client`. */
export interface GoogleGenaiNamespace {
  /** Non-streaming `:generateContent`. */
  generateContent(
    model: ModelId,
    req: GenerateContentRequest,
  ): Promise<Result<GenerateContentResponse, ApiError>>;
  /** Streaming `:streamGenerateContent`. Yields one frame per SSE event. */
  streamGenerateContent(
    model: ModelId,
    req: GenerateContentRequest,
  ): AsyncIterable<Result<GenerateContentChunk, ApiError>>;
  /** `:countTokens` for a Google GenAI prompt. */
  countTokens(
    model: ModelId,
    req: CountTokensRequest,
  ): Promise<Result<CountTokensResponse, ApiError>>;
  readonly agents: GoogleAgentsNamespace;
  readonly interactions: GoogleInteractionsNamespace;
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

const streamGenerate = async function* (
  transport: Transport,
  model: ModelId,
  req: GenerateContentRequest,
): AsyncIterable<Result<GenerateContentChunk, ApiError>> {
  const streamResult = await transport.stream({
    method: "POST",
    path: `/v1beta/models/${encode(model)}:streamGenerateContent`,
    body: req,
  });
  if (!streamResult.ok) {
    yield err(streamResult.error);
    return;
  }
  for await (const event of parseSSE(streamResult.value)) {
    if (event.data === "[DONE]") return;
    const parsed = trySync<GenerateContentChunk>(() => JSON.parse(event.data));
    if (!parsed.ok) {
      yield err(streamError({ reason: "parse", cause: parsed.error }));
      continue;
    }
    yield ok(parsed.value);
  }
};

const createGoogleAgents = (transport: Transport): GoogleAgentsNamespace => ({
  create(req) {
    return transport.request<GoogleAgent>({
      method: "POST",
      path: "/v1beta/agents",
      body: req,
    });
  },
  list(query) {
    return transport.request<ListGoogleAgentsResponse>({
      method: "GET",
      path: "/v1beta/agents",
      ...(query === undefined ? {} : { query: filterUndefined(query) }),
    });
  },
  get(name) {
    return transport.request<GoogleAgent>({
      method: "GET",
      path: `/v1beta/agents/${encode(name)}`,
    });
  },
  delete(name) {
    return transport.request<DeleteGoogleAgentResponse>({
      method: "DELETE",
      path: `/v1beta/agents/${encode(name)}`,
    });
  },
  versions(name) {
    return transport.request<ListAgentVersionsResponse>({
      method: "GET",
      path: `/v1beta/agents/${encode(name)}/versions`,
    });
  },
});

const createGoogleInteractions = (transport: Transport): GoogleInteractionsNamespace => ({
  create(req) {
    return transport.request<Interaction>({
      method: "POST",
      path: "/v1beta/interactions",
      body: req,
    });
  },
  get(interactionId) {
    return transport.request<Interaction>({
      method: "GET",
      path: `/v1beta/interactions/${encode(interactionId)}`,
    });
  },
  cancel(interactionId) {
    return transport.request<unknown>({
      method: "POST",
      path: `/v1beta/interactions/${encode(interactionId)}/cancel`,
    });
  },
  delete(interactionId) {
    return transport.request<unknown>({
      method: "DELETE",
      path: `/v1beta/interactions/${encode(interactionId)}`,
    });
  },
});

/** Bind a `GoogleGenaiNamespace` to a constructed `Transport`. */
export const createGoogleGenai = (transport: Transport): GoogleGenaiNamespace => ({
  generateContent(model, req) {
    return transport.request<GenerateContentResponse>({
      method: "POST",
      path: `/v1beta/models/${encode(model)}:generateContent`,
      body: req,
    });
  },
  streamGenerateContent(model, req) {
    return streamGenerate(transport, model, req);
  },
  countTokens(model, req) {
    return transport.request<CountTokensResponse>({
      method: "POST",
      path: `/v1beta/models/${encode(model)}:countTokens`,
      body: req,
    });
  },
  agents: createGoogleAgents(transport),
  interactions: createGoogleInteractions(transport),
});
