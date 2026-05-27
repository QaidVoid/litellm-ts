import type { ApiError } from "../error.ts";
import type { Result } from "../result.ts";
import type { Transport } from "../transport.ts";

/** Chunking strategy applied when files are attached to a vector store. */
export type VectorStoreChunkingStrategy =
  | { readonly type: "auto" }
  | {
    readonly type: "static";
    readonly static: {
      readonly max_chunk_size_tokens: number;
      readonly chunk_overlap_tokens: number;
    };
  };

/** Expiration policy applied to the vector store. */
export interface VectorStoreExpiration {
  readonly anchor: "last_active_at";
  readonly days: number;
}

/** Counts of files in each lifecycle state. */
export interface VectorStoreFileCounts {
  readonly in_progress: number;
  readonly completed: number;
  readonly failed: number;
  readonly cancelled: number;
  readonly total: number;
}

/** Request body for `POST /v1/vector_stores`. */
export interface CreateVectorStoreRequest {
  readonly name?: string;
  readonly file_ids?: readonly string[];
  readonly expires_after?: VectorStoreExpiration;
  readonly chunking_strategy?: VectorStoreChunkingStrategy;
  readonly metadata?: Readonly<Record<string, string>>;
}

/** Request body for `POST /v1/vector_stores/{id}`. */
export interface UpdateVectorStoreRequest {
  readonly name?: string;
  readonly expires_after?: VectorStoreExpiration | null;
  readonly metadata?: Readonly<Record<string, string>> | null;
}

/** A single vector store record. */
export interface VectorStore {
  readonly id: string;
  readonly object: "vector_store";
  readonly created_at: number;
  readonly name?: string;
  readonly bytes?: number;
  readonly file_counts: VectorStoreFileCounts;
  readonly status: "expired" | "in_progress" | "completed";
  readonly expires_after?: VectorStoreExpiration | null;
  readonly expires_at?: number | null;
  readonly last_active_at?: number | null;
  readonly metadata?: Readonly<Record<string, string>>;
}

/** Query parameters for `GET /v1/vector_stores`. */
export interface ListVectorStoresQuery {
  readonly limit?: number;
  readonly order?: "asc" | "desc";
  readonly after?: string;
  readonly before?: string;
}

/** Response from `GET /v1/vector_stores`. */
export interface ListVectorStoresResponse {
  readonly object: "list";
  readonly data: readonly VectorStore[];
  readonly first_id?: string;
  readonly last_id?: string;
  readonly has_more: boolean;
}

/** Response from `DELETE /v1/vector_stores/{id}`. */
export interface DeleteVectorStoreResponse {
  readonly id: string;
  readonly object: "vector_store.deleted";
  readonly deleted: boolean;
}

/** A single file attachment record. */
export interface VectorStoreFile {
  readonly id: string;
  readonly object: "vector_store.file";
  readonly created_at: number;
  readonly vector_store_id: string;
  readonly status: "in_progress" | "completed" | "cancelled" | "failed";
  readonly last_error?:
    | { readonly code: string; readonly message: string }
    | null;
  readonly chunking_strategy?: VectorStoreChunkingStrategy;
}

/** Request body for attaching a single file. */
export interface AttachVectorStoreFileRequest {
  readonly file_id: string;
  readonly chunking_strategy?: VectorStoreChunkingStrategy;
}

/** Response from `GET /v1/vector_stores/{vs_id}/files`. */
export interface ListVectorStoreFilesResponse {
  readonly object: "list";
  readonly data: readonly VectorStoreFile[];
  readonly first_id?: string;
  readonly last_id?: string;
  readonly has_more: boolean;
}

/** Response from `DELETE /v1/vector_stores/{vs_id}/files/{file_id}`. */
export interface DeleteVectorStoreFileResponse {
  readonly id: string;
  readonly object: "vector_store.file.deleted";
  readonly deleted: boolean;
}

/** A single chunk of file content returned from the content endpoint. */
export interface VectorStoreFileContentChunk {
  /** Wire type tag, typically `"text"` for chunked text content. */
  readonly type: string;
  /** Decoded chunk text. */
  readonly text?: string;
}

/** Response from `GET /v1/vector_stores/{vs_id}/files/{file_id}/content`. */
export interface VectorStoreFileContentResponse {
  readonly object: "vector_store.file_content.page";
  /** Ordered list of chunks the proxy extracted from the file. */
  readonly data: readonly VectorStoreFileContentChunk[];
  readonly has_more: boolean;
  readonly next_page?: string | null;
}

/** Surface for the vector stores endpoint on the `Client`. */
export interface VectorStoresNamespace {
  /** Create a new vector store. */
  create(req: CreateVectorStoreRequest): Promise<Result<VectorStore, ApiError>>;
  /** Retrieve a vector store by id. */
  retrieve(vectorStoreId: string): Promise<Result<VectorStore, ApiError>>;
  /** Partially update a vector store. */
  update(
    vectorStoreId: string,
    req: UpdateVectorStoreRequest,
  ): Promise<Result<VectorStore, ApiError>>;
  /** List vector stores. */
  list(query?: ListVectorStoresQuery): Promise<Result<ListVectorStoresResponse, ApiError>>;
  /** Delete a vector store. */
  delete(vectorStoreId: string): Promise<Result<DeleteVectorStoreResponse, ApiError>>;
  /** Attach an existing uploaded file to a vector store. */
  attachFile(
    vectorStoreId: string,
    req: AttachVectorStoreFileRequest,
  ): Promise<Result<VectorStoreFile, ApiError>>;
  /** List files attached to a vector store. */
  listFiles(
    vectorStoreId: string,
    query?: ListVectorStoresQuery,
  ): Promise<Result<ListVectorStoreFilesResponse, ApiError>>;
  /** Retrieve a single file attachment record. */
  retrieveFile(
    vectorStoreId: string,
    fileId: string,
  ): Promise<Result<VectorStoreFile, ApiError>>;
  /** Detach a file from a vector store. */
  deleteFile(
    vectorStoreId: string,
    fileId: string,
  ): Promise<Result<DeleteVectorStoreFileResponse, ApiError>>;
  /** Fetch parsed content chunks for a file attached to a vector store. */
  fileContent(
    vectorStoreId: string,
    fileId: string,
  ): Promise<Result<VectorStoreFileContentResponse, ApiError>>;
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

const enc = (s: string): string => encodeURIComponent(s);

/** Bind a `VectorStoresNamespace` to a constructed `Transport`. */
export const createVectorStores = (transport: Transport): VectorStoresNamespace => ({
  create(req) {
    return transport.request<VectorStore>({
      method: "POST",
      path: "/v1/vector_stores",
      body: req,
    });
  },
  retrieve(vectorStoreId) {
    return transport.request<VectorStore>({
      method: "GET",
      path: `/v1/vector_stores/${enc(vectorStoreId)}`,
    });
  },
  update(vectorStoreId, req) {
    return transport.request<VectorStore>({
      method: "POST",
      path: `/v1/vector_stores/${enc(vectorStoreId)}`,
      body: req,
    });
  },
  list(query) {
    return transport.request<ListVectorStoresResponse>({
      method: "GET",
      path: "/v1/vector_stores",
      ...(query === undefined ? {} : { query: filterUndefined(query) }),
    });
  },
  delete(vectorStoreId) {
    return transport.request<DeleteVectorStoreResponse>({
      method: "DELETE",
      path: `/v1/vector_stores/${enc(vectorStoreId)}`,
    });
  },
  attachFile(vectorStoreId, req) {
    return transport.request<VectorStoreFile>({
      method: "POST",
      path: `/v1/vector_stores/${enc(vectorStoreId)}/files`,
      body: req,
    });
  },
  listFiles(vectorStoreId, query) {
    return transport.request<ListVectorStoreFilesResponse>({
      method: "GET",
      path: `/v1/vector_stores/${enc(vectorStoreId)}/files`,
      ...(query === undefined ? {} : { query: filterUndefined(query) }),
    });
  },
  retrieveFile(vectorStoreId, fileId) {
    return transport.request<VectorStoreFile>({
      method: "GET",
      path: `/v1/vector_stores/${enc(vectorStoreId)}/files/${enc(fileId)}`,
    });
  },
  deleteFile(vectorStoreId, fileId) {
    return transport.request<DeleteVectorStoreFileResponse>({
      method: "DELETE",
      path: `/v1/vector_stores/${enc(vectorStoreId)}/files/${enc(fileId)}`,
    });
  },
  fileContent(vectorStoreId, fileId) {
    return transport.request<VectorStoreFileContentResponse>({
      method: "GET",
      path: `/v1/vector_stores/${enc(vectorStoreId)}/files/${enc(fileId)}/content`,
    });
  },
});
