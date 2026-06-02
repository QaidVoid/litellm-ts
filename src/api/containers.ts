import type { ApiError } from "../error.ts";
import { networkError } from "../error.ts";
import type { Result } from "../result.ts";
import { err, ok, tryAsync } from "../result.ts";
import type { Transport } from "../transport.ts";

/** Expiration policy applied when a container is created. */
export interface ContainerExpiration {
  /** Anchor field the timer counts from. */
  readonly anchor: "last_active_at";
  /** Minutes after the anchor when the container expires. */
  readonly minutes: number;
}

/** Request body for `POST /v1/containers`. */
export interface CreateContainerRequest {
  /** Human-readable label. */
  readonly name?: string;
  /** Existing file ids to attach at creation time. */
  readonly file_ids?: readonly string[];
  /** Expiration policy. Without one the container lives indefinitely. */
  readonly expires_after?: ContainerExpiration;
  /** Free-form metadata. */
  readonly metadata?: Readonly<Record<string, string>>;
}

/** A single container record. */
export interface Container {
  /** Server-assigned id. */
  readonly id: string;
  /** Discriminator, always `"container"`. */
  readonly object: "container";
  /** Unix epoch seconds when the container was created. */
  readonly created_at: number;
  /** Container name. */
  readonly name?: string;
  /** Lifecycle status string. */
  readonly status?: string;
  /** Expiration policy if one was set. */
  readonly expires_after?: ContainerExpiration;
  /** Unix epoch seconds when the container was last active. */
  readonly last_active_at?: number;
  /** Free-form metadata. */
  readonly metadata?: Readonly<Record<string, string>>;
}

/** Query parameters for `GET /v1/containers`. */
export interface ListContainersQuery {
  /** Maximum records per page. */
  readonly limit?: number;
  /** Sort direction. */
  readonly order?: "asc" | "desc";
  /** Cursor: return records after this id. */
  readonly after?: string;
  /** Cursor: return records before this id. */
  readonly before?: string;
}

/** Response from `GET /v1/containers`. */
export interface ListContainersResponse {
  /** Discriminator, always `"list"`. */
  readonly object: "list";
  /** Containers on the current page. */
  readonly data: readonly Container[];
  /** Id of the first record on the page. */
  readonly first_id?: string;
  /** Id of the last record on the page. */
  readonly last_id?: string;
  /** True when more pages remain. */
  readonly has_more: boolean;
}

/** Bytes accepted by `containers.files.create`. */
export type ContainerFileInput = Blob | Uint8Array;

/** A single file attached to a container. */
export interface ContainerFile {
  /** Server-assigned id. */
  readonly id: string;
  /** Discriminator, always `"container.file"`. */
  readonly object: "container.file";
  /** Owning container id. */
  readonly container_id: string;
  /** Unix epoch seconds when the file was uploaded. */
  readonly created_at: number;
  /** Reported size in bytes. */
  readonly bytes?: number;
  /** Path of the file within the container. */
  readonly path: string;
  /** Source the file originated from. */
  readonly source: string;
}

/** Query parameters for `GET /v1/containers/{id}/files`. */
export interface ListContainerFilesQuery {
  /** Maximum records per page. */
  readonly limit?: number;
  /** Sort direction. */
  readonly order?: "asc" | "desc";
  /** Cursor: return records after this id. */
  readonly after?: string;
  /** Cursor: return records before this id. */
  readonly before?: string;
}

/** Response from `GET /v1/containers/{id}/files`. */
export interface ListContainerFilesResponse {
  /** Discriminator, always `"list"`. */
  readonly object: "list";
  /** Files on the current page. */
  readonly data: readonly ContainerFile[];
  /** Id of the first record on the page. */
  readonly first_id?: string;
  /** Id of the last record on the page. */
  readonly last_id?: string;
  /** True when more pages remain. */
  readonly has_more: boolean;
}

/** Response from `DELETE /v1/containers/{id}/files/{file_id}`. */
export interface DeleteContainerFileResponse {
  /** Id of the deleted file. */
  readonly id: string;
  /** Discriminator, always `"container.file.deleted"`. */
  readonly object: "container.file.deleted";
  /** True when the delete succeeded. */
  readonly deleted: boolean;
}

/** Surface for managing files attached to a container. */
export interface ContainerFilesNamespace {
  /** Upload a new file into the container. */
  create(
    containerId: string,
    file: ContainerFileInput,
    filename?: string,
  ): Promise<Result<ContainerFile, ApiError>>;
  /** List files attached to a container. */
  list(
    containerId: string,
    query?: ListContainerFilesQuery,
  ): Promise<Result<ListContainerFilesResponse, ApiError>>;
  /** Retrieve a single file's metadata. */
  retrieve(
    containerId: string,
    fileId: string,
  ): Promise<Result<ContainerFile, ApiError>>;
  /** Download the raw bytes of a container file. */
  content(containerId: string, fileId: string): Promise<Result<Uint8Array, ApiError>>;
  /** Delete a file from a container. */
  delete(
    containerId: string,
    fileId: string,
  ): Promise<Result<DeleteContainerFileResponse, ApiError>>;
}

/** Response from `DELETE /v1/containers/{id}`. */
export interface DeleteContainerResponse {
  /** Id of the deleted container. */
  readonly id: string;
  /** Discriminator, always `"container.deleted"`. */
  readonly object: "container.deleted";
  /** True when the delete succeeded. */
  readonly deleted: boolean;
}

/** Surface for the OpenAI Containers API on the `Client`. */
export interface ContainersNamespace {
  /** Create a new container. */
  create(req: CreateContainerRequest): Promise<Result<Container, ApiError>>;
  /** List containers. */
  list(query?: ListContainersQuery): Promise<Result<ListContainersResponse, ApiError>>;
  /** Retrieve a container by id. */
  retrieve(containerId: string): Promise<Result<Container, ApiError>>;
  /** Delete a container by id. */
  delete(containerId: string): Promise<Result<DeleteContainerResponse, ApiError>>;
  /** File sub-resource scoped to a container. */
  readonly files: ContainerFilesNamespace;
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

/** Bind a `ContainersNamespace` to a constructed `Transport`. */
export const createContainers = (transport: Transport): ContainersNamespace => ({
  create(req) {
    return transport.request<Container>({
      method: "POST",
      path: "/v1/containers",
      body: req,
    });
  },
  list(query) {
    return transport.request<ListContainersResponse>({
      method: "GET",
      path: "/v1/containers",
      ...(query === undefined ? {} : { query: filterUndefined(query) }),
    });
  },
  retrieve(containerId) {
    return transport.request<Container>({
      method: "GET",
      path: `/v1/containers/${encode(containerId)}`,
    });
  },
  delete(containerId) {
    return transport.request<DeleteContainerResponse>({
      method: "DELETE",
      path: `/v1/containers/${encode(containerId)}`,
    });
  },
  files: {
    create(containerId, file, filename) {
      const fd = new FormData();
      const blob = file instanceof Blob ? file : new Blob([file as BlobPart]);
      fd.append("file", blob, filename ?? "file");
      return transport.request<ContainerFile>({
        method: "POST",
        path: `/v1/containers/${encode(containerId)}/files`,
        body: fd,
      });
    },
    list(containerId, query) {
      return transport.request<ListContainerFilesResponse>({
        method: "GET",
        path: `/v1/containers/${encode(containerId)}/files`,
        ...(query === undefined ? {} : { query: filterUndefined(query) }),
      });
    },
    retrieve(containerId, fileId) {
      return transport.request<ContainerFile>({
        method: "GET",
        path: `/v1/containers/${encode(containerId)}/files/${encode(fileId)}`,
      });
    },
    async content(containerId, fileId) {
      const res = await transport.fetchRaw({
        method: "GET",
        path: `/v1/containers/${encode(containerId)}/files/${encode(fileId)}/content`,
      });
      if (!res.ok) return res;
      const bytes = await tryAsync(async () => new Uint8Array(await res.value.arrayBuffer()));
      if (!bytes.ok) {
        return err(networkError(bytes.error, "failed to read container file body"));
      }
      return ok(bytes.value);
    },
    delete(containerId, fileId) {
      return transport.request<DeleteContainerFileResponse>({
        method: "DELETE",
        path: `/v1/containers/${encode(containerId)}/files/${encode(fileId)}`,
      });
    },
  },
});
