import type { ApiError } from "../../error.ts";
import type { Result } from "../../result.ts";
import type { Transport } from "../../transport.ts";

/**
 * A managed vector store record on the proxy. Matches the
 * `LiteLLM_ManagedVectorStore` payload stored in the database.
 */
export interface ManagedVectorStore {
  /** Unique vector store id. */
  readonly vector_store_id: string;
  /** Provider id (e.g. `"bedrock"`, `"ragflow"`). */
  readonly custom_llm_provider: string;
  /** Human-friendly name. */
  readonly vector_store_name?: string | null;
  /** Free-form description. */
  readonly vector_store_description?: string | null;
  /** Caller-supplied metadata; can be either an object or a JSON string. */
  readonly vector_store_metadata?: Readonly<Record<string, unknown>> | string | null;
  /** ISO-8601 creation timestamp. */
  readonly created_at?: string | null;
  /** ISO-8601 last-update timestamp. */
  readonly updated_at?: string | null;
  /** Name of the stored credential used at request time. */
  readonly litellm_credential_name?: string | null;
  /** Provider-specific routing parameters (redacted on response). */
  readonly litellm_params?: Readonly<Record<string, unknown>> | null;
  /** Owning team id (access control). */
  readonly team_id?: string | null;
  /** Owning user id (access control). */
  readonly user_id?: string | null;
}

/** Request body for `POST /vector_store/new`. */
export interface CreateManagedVectorStoreRequest {
  /** Unique vector store id. */
  readonly vector_store_id: string;
  /** Provider id (e.g. `"bedrock"`). */
  readonly custom_llm_provider: string;
  /** Friendly name. */
  readonly vector_store_name?: string;
  /** Description. */
  readonly vector_store_description?: string;
  /** Caller-supplied metadata bag. */
  readonly vector_store_metadata?: Readonly<Record<string, unknown>> | string;
  /** Stored credential the proxy should use. */
  readonly litellm_credential_name?: string;
  /** Provider-specific routing parameters. */
  readonly litellm_params?: Readonly<Record<string, unknown>>;
}

/** Response from `POST /vector_store/new`. */
export interface CreateManagedVectorStoreResponse {
  /** Result tag. */
  readonly status: "success";
  /** Human-readable status message. */
  readonly message: string;
  /** Created vector store row (litellm_params redacted). */
  readonly vector_store: ManagedVectorStore;
}

/** Query parameters for `GET /vector_store/list` and `GET /v1/vector_store/list`. */
export interface ListManagedVectorStoresQuery {
  /** Page number (1-indexed). Default 1. */
  readonly page?: number;
  /** Page size. Default 100. */
  readonly page_size?: number;
}

/** Response from `GET /vector_store/list`. */
export interface ListManagedVectorStoresResponse {
  /** Object kind, always `"list"`. */
  readonly object: "list";
  /** Returned vector store rows. */
  readonly data: readonly ManagedVectorStore[];
  /** Total matching count. */
  readonly total_count?: number;
  /** Page number returned. */
  readonly current_page?: number;
  /** Total page count. */
  readonly total_pages?: number;
}

/** Request body for `POST /vector_store/info`. */
export interface ManagedVectorStoreInfoRequest {
  /** Vector store id to retrieve. */
  readonly vector_store_id: string;
}

/** Response from `POST /vector_store/info`. */
export interface ManagedVectorStoreInfoResponse {
  /** Vector store row. */
  readonly vector_store: ManagedVectorStore;
}

/** Request body for `POST /vector_store/update`. */
export interface UpdateManagedVectorStoreRequest {
  /** Vector store id to update. */
  readonly vector_store_id: string;
  /** Replace the provider id. */
  readonly custom_llm_provider?: string;
  /** Replace the friendly name. */
  readonly vector_store_name?: string;
  /** Replace the description. */
  readonly vector_store_description?: string;
  /** Replace the metadata bag. */
  readonly vector_store_metadata?: Readonly<Record<string, unknown>>;
}

/** Request body for `POST /vector_store/delete`. */
export interface DeleteManagedVectorStoreRequest {
  /** Vector store id to delete. */
  readonly vector_store_id: string;
}

/** Response from `POST /vector_store/delete`. */
export interface DeleteManagedVectorStoreResponse {
  /** Result tag. */
  readonly status: "success";
  /** Human-readable status message. */
  readonly message: string;
}

/**
 * Surface for the legacy singular `/vector_store/*` proxy administration
 * endpoints. Distinct from `client.vectorStores`, which targets the OpenAI
 * `/v1/vector_stores` plural surface (file attachments and search).
 */
export interface VectorStoresAdminNamespace {
  /** Register a new managed vector store. */
  create(
    req: CreateManagedVectorStoreRequest,
  ): Promise<Result<CreateManagedVectorStoreResponse, ApiError>>;
  /** List managed vector stores (paginated). */
  list(
    query?: ListManagedVectorStoresQuery,
  ): Promise<Result<ListManagedVectorStoresResponse, ApiError>>;
  /**
   * v1 alias for `list`: hits `/v1/vector_store/list`, which the proxy
   * registers alongside `/vector_store/list`.
   */
  listV1(
    query?: ListManagedVectorStoresQuery,
  ): Promise<Result<ListManagedVectorStoresResponse, ApiError>>;
  /** Retrieve a managed vector store by id. */
  info(
    req: ManagedVectorStoreInfoRequest,
  ): Promise<Result<ManagedVectorStoreInfoResponse, ApiError>>;
  /** Partially update a managed vector store. */
  update(
    req: UpdateManagedVectorStoreRequest,
  ): Promise<Result<unknown, ApiError>>;
  /** Delete a managed vector store from the DB and in-memory registry. */
  delete(
    req: DeleteManagedVectorStoreRequest,
  ): Promise<Result<DeleteManagedVectorStoreResponse, ApiError>>;
}

/** Bind a `VectorStoresAdminNamespace` to a constructed `Transport`. */
export const createVectorStoresAdmin = (
  transport: Transport,
): VectorStoresAdminNamespace => ({
  create(req) {
    return transport.request<CreateManagedVectorStoreResponse>({
      method: "POST",
      path: "/vector_store/new",
      body: req,
    });
  },
  list(query) {
    return transport.request<ListManagedVectorStoresResponse>({
      method: "GET",
      path: "/vector_store/list",
      ...(query === undefined ? {} : { query }),
    });
  },
  listV1(query) {
    return transport.request<ListManagedVectorStoresResponse>({
      method: "GET",
      path: "/v1/vector_store/list",
      ...(query === undefined ? {} : { query }),
    });
  },
  info(req) {
    return transport.request<ManagedVectorStoreInfoResponse>({
      method: "POST",
      path: "/vector_store/info",
      body: req,
    });
  },
  update(req) {
    return transport.request<unknown>({
      method: "POST",
      path: "/vector_store/update",
      body: req,
    });
  },
  delete(req) {
    return transport.request<DeleteManagedVectorStoreResponse>({
      method: "POST",
      path: "/vector_store/delete",
      body: req,
    });
  },
});
