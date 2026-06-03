import type { ApiError } from "../../error.ts";
import type { Result } from "../../result.ts";
import type { Transport } from "../../transport.ts";

/** Request body for `/jwt/key/mapping/new`. */
export interface CreateJwtMappingRequest {
  /** Name of the JWT claim used for matching. */
  readonly jwt_claim_name: string;
  /** Required value of the claim. */
  readonly jwt_claim_value: string;
  /** Virtual key the claim maps to. Stored hashed on the proxy. */
  readonly key: string;
  /** Free-form description shown in the admin UI. */
  readonly description?: string;
}

/** Request body for `/jwt/key/mapping/update`. */
export interface UpdateJwtMappingRequest {
  /** Id of the mapping to update. */
  readonly id: string;
  /** Replace the mapped virtual key. */
  readonly key?: string;
  /** Replace the description. */
  readonly description?: string;
  /** Enable or disable the mapping without deleting it. */
  readonly is_active?: boolean;
}

/** Request body for `/jwt/key/mapping/delete`. */
export interface DeleteJwtMappingRequest {
  /** Id of the mapping to delete. */
  readonly id: string;
}

/** A JWT-claim-to-virtual-key mapping. */
export interface JwtMapping {
  /** Server-assigned id. */
  readonly id: string;
  /** Name of the JWT claim used for matching. */
  readonly jwt_claim_name: string;
  /** Required claim value. */
  readonly jwt_claim_value: string;
  /** Free-form description. */
  readonly description?: string;
  /** True when the mapping is active. */
  readonly is_active: boolean;
  /** ISO-8601 creation timestamp. */
  readonly created_at: string;
  /** ISO-8601 last-update timestamp. */
  readonly updated_at: string;
  /** Identifier of the creating user. */
  readonly created_by?: string;
  /** Identifier of the last user to update. */
  readonly updated_by?: string;
}

/** Query parameters for `/jwt/key/mapping/list`. */
export interface ListJwtMappingsQuery {
  /** 1-based page number. */
  readonly page?: number;
  /** Page size. */
  readonly size?: number;
}

/** Response from `/jwt/key/mapping/list`. */
export interface ListJwtMappingsResponse {
  /** Mappings on the current page. */
  readonly mappings: readonly JwtMapping[];
  /** Total mapping count across all pages. */
  readonly total_count: number;
  /** Page number returned. */
  readonly current_page: number;
  /** Total page count for the current page size. */
  readonly total_pages: number;
}

/** Surface for JWT-key-mapping administration on the `Client`. */
export interface JwtMappingsNamespace {
  /** Create a new mapping. */
  create(req: CreateJwtMappingRequest): Promise<Result<JwtMapping, ApiError>>;
  /** Update an existing mapping. */
  update(req: UpdateJwtMappingRequest): Promise<Result<JwtMapping, ApiError>>;
  /** Delete a mapping by id. */
  delete(req: DeleteJwtMappingRequest): Promise<Result<{ readonly status: "success" }, ApiError>>;
  /** List mappings (paginated). */
  list(query?: ListJwtMappingsQuery): Promise<Result<ListJwtMappingsResponse, ApiError>>;
  /** Get a single mapping by id. */
  info(id: string): Promise<Result<JwtMapping, ApiError>>;
}

/** Bind a `JwtMappingsNamespace` to a constructed `Transport`. */
export const createJwtMappings = (transport: Transport): JwtMappingsNamespace => ({
  create(req) {
    return transport.request<JwtMapping>({
      method: "POST",
      path: "/jwt/key/mapping/new",
      body: req,
    });
  },
  update(req) {
    return transport.request<JwtMapping>({
      method: "POST",
      path: "/jwt/key/mapping/update",
      body: req,
    });
  },
  delete(req) {
    return transport.request<{ readonly status: "success" }>({
      method: "POST",
      path: "/jwt/key/mapping/delete",
      body: req,
    });
  },
  list(query) {
    return transport.request<ListJwtMappingsResponse>({
      method: "GET",
      path: "/jwt/key/mapping/list",
      ...(query === undefined ? {} : { query }),
    });
  },
  info(id) {
    return transport.request<JwtMapping>({
      method: "GET",
      path: "/jwt/key/mapping/info",
      query: { id },
    });
  },
});
