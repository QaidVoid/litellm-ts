import type { ApiError } from "../../error.ts";
import type { Result } from "../../result.ts";
import type { Transport } from "../../transport.ts";

/** Request body for `/jwt/key/mapping/new`. */
export interface CreateJwtMappingRequest {
  readonly jwt_claim_name: string;
  readonly jwt_claim_value: string;
  /** Virtual key the claim maps to. Stored hashed on the proxy. */
  readonly key: string;
  readonly description?: string;
}

/** Request body for `/jwt/key/mapping/update`. */
export interface UpdateJwtMappingRequest {
  readonly id: string;
  readonly key?: string;
  readonly description?: string;
  readonly is_active?: boolean;
}

/** Request body for `/jwt/key/mapping/delete`. */
export interface DeleteJwtMappingRequest {
  readonly id: string;
}

/** A JWT-claim-to-virtual-key mapping. */
export interface JwtMapping {
  readonly id: string;
  readonly jwt_claim_name: string;
  readonly jwt_claim_value: string;
  readonly description?: string;
  readonly is_active: boolean;
  readonly created_at: string;
  readonly updated_at: string;
  readonly created_by?: string;
  readonly updated_by?: string;
}

/** Query parameters for `/jwt/key/mapping/list`. */
export interface ListJwtMappingsQuery {
  readonly page?: number;
  readonly size?: number;
}

/** Response from `/jwt/key/mapping/list`. */
export interface ListJwtMappingsResponse {
  readonly mappings: readonly JwtMapping[];
  readonly total_count: number;
  readonly current_page: number;
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

const filterUndefined = <T extends object>(
  q: T,
): Readonly<Record<string, string | number | boolean>> => {
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(q)) {
    if (v !== undefined) out[k] = v as string | number | boolean;
  }
  return out;
};

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
      ...(query === undefined ? {} : { query: filterUndefined(query) }),
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
