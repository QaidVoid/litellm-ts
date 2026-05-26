import type { ApiError } from "../error.ts";
import { networkError } from "../error.ts";
import type { Result } from "../result.ts";
import { err, ok, tryAsync } from "../result.ts";
import type { Transport } from "../transport.ts";

/** Allowed values for the `purpose` field on file uploads. */
export type FilePurpose =
  | "assistants"
  | "assistants_output"
  | "batch"
  | "batch_output"
  | "fine-tune"
  | "fine-tune-results"
  | "vision"
  | "user_data"
  | "evals";

/** Lifecycle status of an uploaded file. */
export type FileStatus = "uploaded" | "processed" | "error";

/** A single file record. */
export interface FileObject {
  /** Server-assigned identifier (use to retrieve, delete, or fetch content). */
  readonly id: string;
  readonly object: "file";
  /** Size in bytes. */
  readonly bytes: number;
  /** Unix timestamp (seconds) of upload. */
  readonly created_at: number;
  /** Original filename supplied at upload. */
  readonly filename: string;
  /** Intended use of the file. */
  readonly purpose: FilePurpose;
  /** Server-side processing state. */
  readonly status?: FileStatus;
  /** Free-form details when `status` is `"error"`. */
  readonly status_details?: string;
}

/** Bytes accepted by `files.create`. Uint8Arrays are wrapped in a `Blob`. */
export type FileUpload = Blob | Uint8Array;

/** Request body for `files.create`. */
export interface FileCreateRequest {
  /** The file bytes. Use a `Blob`/`File` to preserve content type. */
  readonly file: FileUpload;
  /** Filename to attach. Defaults to `"upload.bin"` when `file` is raw bytes. */
  readonly filename?: string;
  /** Intended use of the file. The proxy may restrict combinations. */
  readonly purpose: FilePurpose;
}

/** Query parameters for `files.list`. */
export interface FileListQuery {
  /** Filter to a single purpose. */
  readonly purpose?: FilePurpose;
}

/** A paginated list response from `files.list`. */
export interface FileListResponse {
  readonly object: "list";
  /** One entry per matching file. */
  readonly data: readonly FileObject[];
}

/** Response from `files.delete`. */
export interface FileDeleteResponse {
  readonly id: string;
  readonly object: "file";
  /** True when the file was deleted. */
  readonly deleted: boolean;
}

/** Surface for the files endpoint on the `Client`. */
export interface FilesNamespace {
  /** Upload a new file. */
  create(req: FileCreateRequest): Promise<Result<FileObject, ApiError>>;
  /** List previously uploaded files, optionally filtered by purpose. */
  list(query?: FileListQuery): Promise<Result<FileListResponse, ApiError>>;
  /** Look up a single file by id. */
  retrieve(fileId: string): Promise<Result<FileObject, ApiError>>;
  /** Delete a file by id. */
  delete(fileId: string): Promise<Result<FileDeleteResponse, ApiError>>;
  /** Fetch the raw bytes of a file by id. */
  content(fileId: string): Promise<Result<Uint8Array, ApiError>>;
}

const toBlob = (input: FileUpload): Blob =>
  input instanceof Blob ? input : new Blob([input as BlobPart]);

const buildUploadForm = (req: FileCreateRequest): FormData => {
  const fd = new FormData();
  fd.append("file", toBlob(req.file), req.filename ?? "upload.bin");
  fd.append("purpose", req.purpose);
  return fd;
};

/** Bind a `FilesNamespace` to a constructed `Transport`. */
export const createFiles = (transport: Transport): FilesNamespace => ({
  create(req) {
    return transport.request<FileObject>({
      method: "POST",
      path: "/v1/files",
      body: buildUploadForm(req),
    });
  },
  list(query) {
    return transport.request<FileListResponse>({
      method: "GET",
      path: "/v1/files",
      ...(query?.purpose === undefined ? {} : { query: { purpose: query.purpose } }),
    });
  },
  retrieve(fileId) {
    return transport.request<FileObject>({
      method: "GET",
      path: `/v1/files/${encodeURIComponent(fileId)}`,
    });
  },
  delete(fileId) {
    return transport.request<FileDeleteResponse>({
      method: "DELETE",
      path: `/v1/files/${encodeURIComponent(fileId)}`,
    });
  },
  async content(fileId) {
    const res = await transport.fetchRaw({
      method: "GET",
      path: `/v1/files/${encodeURIComponent(fileId)}/content`,
    });
    if (!res.ok) return res;
    const bytes = await tryAsync(async () => new Uint8Array(await res.value.arrayBuffer()));
    if (!bytes.ok) {
      return err(networkError(bytes.error, "failed to read file content body"));
    }
    return ok(bytes.value);
  },
});
