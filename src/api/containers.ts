import type { ApiError } from "../error.ts";
import type { Result } from "../result.ts";
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
  readonly object: "container";
  /** Unix epoch seconds when the container was created. */
  readonly created_at: number;
  readonly name?: string;
  readonly status?: string;
  readonly expires_after?: ContainerExpiration;
  /** Unix epoch seconds when the container was last active. */
  readonly last_active_at?: number;
  readonly metadata?: Readonly<Record<string, string>>;
}

/** Query parameters for `GET /v1/containers`. */
export interface ListContainersQuery {
  readonly limit?: number;
  readonly order?: "asc" | "desc";
  readonly after?: string;
  readonly before?: string;
}

/** Response from `GET /v1/containers`. */
export interface ListContainersResponse {
  readonly object: "list";
  readonly data: readonly Container[];
  readonly first_id?: string;
  readonly last_id?: string;
  readonly has_more: boolean;
}

/** Response from `DELETE /v1/containers/{id}`. */
export interface DeleteContainerResponse {
  readonly id: string;
  readonly object: "container.deleted";
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
});
