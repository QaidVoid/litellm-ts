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
  /** Anchor field the timer counts from. */
  readonly anchor: "last_active_at";
  /** Days after the anchor when the store expires. */
  readonly days: number;
}

/** Counts of files in each lifecycle state. */
export interface VectorStoreFileCounts {
  /** Files still being processed. */
  readonly in_progress: number;
  /** Files successfully indexed. */
  readonly completed: number;
  /** Files that failed indexing. */
  readonly failed: number;
  /** Files whose attachment was cancelled. */
  readonly cancelled: number;
  /** Sum of all file counts. */
  readonly total: number;
}

/** Request body for `POST /v1/vector_stores`. */
export interface CreateVectorStoreRequest {
  /** Display name. */
  readonly name?: string;
  /** Existing file ids to attach at creation time. */
  readonly file_ids?: readonly string[];
  /** Expiration policy. */
  readonly expires_after?: VectorStoreExpiration;
  /** Chunking strategy applied to attached files. */
  readonly chunking_strategy?: VectorStoreChunkingStrategy;
  /** Free-form metadata. */
  readonly metadata?: Readonly<Record<string, string>>;
}

/** Request body for `POST /v1/vector_stores/{id}`. */
export interface UpdateVectorStoreRequest {
  /** Rename the store. */
  readonly name?: string;
  /** Replace or clear the expiration policy. */
  readonly expires_after?: VectorStoreExpiration | null;
  /** Replace or clear the metadata bag. */
  readonly metadata?: Readonly<Record<string, string>> | null;
}

/** A single vector store record. */
export interface VectorStore {
  /** Server-assigned id. */
  readonly id: string;
  /** Discriminator, always `"vector_store"`. */
  readonly object: "vector_store";
  /** Unix epoch seconds when the store was created. */
  readonly created_at: number;
  /** Display name. */
  readonly name?: string;
  /** Total stored bytes. */
  readonly bytes?: number;
  /** Counts of files in each lifecycle state. */
  readonly file_counts: VectorStoreFileCounts;
  /** Lifecycle status. */
  readonly status: "expired" | "in_progress" | "completed";
  /** Expiration policy, when set. */
  readonly expires_after?: VectorStoreExpiration | null;
  /** Unix epoch seconds when the store expires. */
  readonly expires_at?: number | null;
  /** Unix epoch seconds when the store was last active. */
  readonly last_active_at?: number | null;
  /** Free-form metadata. */
  readonly metadata?: Readonly<Record<string, string>>;
}

/** Query parameters for `GET /v1/vector_stores`. */
export interface ListVectorStoresQuery {
  /** Maximum records per page. */
  readonly limit?: number;
  /** Sort direction. */
  readonly order?: "asc" | "desc";
  /** Cursor: return records after this id. */
  readonly after?: string;
  /** Cursor: return records before this id. */
  readonly before?: string;
}

/** Response from `GET /v1/vector_stores`. */
export interface ListVectorStoresResponse {
  /** Discriminator, always `"list"`. */
  readonly object: "list";
  /** Stores on the current page. */
  readonly data: readonly VectorStore[];
  /** Id of the first record on the page. */
  readonly first_id?: string;
  /** Id of the last record on the page. */
  readonly last_id?: string;
  /** True when more pages remain. */
  readonly has_more: boolean;
}

/** Response from `DELETE /v1/vector_stores/{id}`. */
export interface DeleteVectorStoreResponse {
  /** Id of the deleted store. */
  readonly id: string;
  /** Discriminator, always `"vector_store.deleted"`. */
  readonly object: "vector_store.deleted";
  /** True when the delete succeeded. */
  readonly deleted: boolean;
}

/** A single file attachment record. */
export interface VectorStoreFile {
  /** Server-assigned id. */
  readonly id: string;
  /** Discriminator, always `"vector_store.file"`. */
  readonly object: "vector_store.file";
  /** Unix epoch seconds when the file was attached. */
  readonly created_at: number;
  /** Parent vector store id. */
  readonly vector_store_id: string;
  /** Lifecycle status of the attachment. */
  readonly status: "in_progress" | "completed" | "cancelled" | "failed";
  /** Last indexing error, when applicable. */
  readonly last_error?:
    | { readonly code: string; readonly message: string }
    | null;
  /** Chunking strategy used for this file. */
  readonly chunking_strategy?: VectorStoreChunkingStrategy;
}

/** Request body for attaching a single file. */
export interface AttachVectorStoreFileRequest {
  /** Id of a previously uploaded file. */
  readonly file_id: string;
  /** Chunking strategy override. */
  readonly chunking_strategy?: VectorStoreChunkingStrategy;
}

/** Response from `GET /v1/vector_stores/{vs_id}/files`. */
export interface ListVectorStoreFilesResponse {
  /** Discriminator, always `"list"`. */
  readonly object: "list";
  /** Attachments on the current page. */
  readonly data: readonly VectorStoreFile[];
  /** Id of the first record on the page. */
  readonly first_id?: string;
  /** Id of the last record on the page. */
  readonly last_id?: string;
  /** True when more pages remain. */
  readonly has_more: boolean;
}

/** Response from `DELETE /v1/vector_stores/{vs_id}/files/{file_id}`. */
export interface DeleteVectorStoreFileResponse {
  /** Id of the detached file. */
  readonly id: string;
  /** Discriminator, always `"vector_store.file.deleted"`. */
  readonly object: "vector_store.file.deleted";
  /** True when the detach succeeded. */
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
  /** Discriminator, always `"vector_store.file_content.page"`. */
  readonly object: "vector_store.file_content.page";
  /** Ordered list of chunks the proxy extracted from the file. */
  readonly data: readonly VectorStoreFileContentChunk[];
  /** True when more pages remain. */
  readonly has_more: boolean;
  /** Cursor token for the next page. */
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
