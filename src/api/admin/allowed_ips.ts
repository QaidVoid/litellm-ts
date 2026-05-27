import type { ApiError } from "../../error.ts";
import type { Result } from "../../result.ts";
import type { Transport } from "../../transport.ts";

/** Response from `GET /get/allowed_ips`. */
export interface AllowedIpsListResponse {
  /** Currently allowed IPs (or `null` when no allowlist is configured). */
  readonly data: readonly string[] | null;
}

/** Request body for `POST /add/allowed_ip` and `POST /delete/allowed_ip`. */
export interface AllowedIpMutationRequest {
  /** IP address to add or remove. */
  readonly ip: string;
}

/** Response from `POST /add/allowed_ip` and `POST /delete/allowed_ip`. */
export interface AllowedIpMutationResponse {
  /** Human-readable status message. */
  readonly message: string;
  /** Result tag. */
  readonly status: "success";
}

/** Surface for the IP allowlist administration on the `Client`. */
export interface AllowedIpsNamespace {
  /** Read the current allowlist (`null` when unset). */
  list(): Promise<Result<AllowedIpsListResponse, ApiError>>;
  /** Append an IP to the allowlist. Errors if the entry already exists. */
  add(req: AllowedIpMutationRequest): Promise<Result<AllowedIpMutationResponse, ApiError>>;
  /** Remove an IP from the allowlist. Errors if the entry isn't present. */
  delete(req: AllowedIpMutationRequest): Promise<Result<AllowedIpMutationResponse, ApiError>>;
}

/** Bind an `AllowedIpsNamespace` to a constructed `Transport`. */
export const createAllowedIps = (transport: Transport): AllowedIpsNamespace => ({
  list() {
    return transport.request<AllowedIpsListResponse>({
      method: "GET",
      path: "/get/allowed_ips",
    });
  },
  add(req) {
    return transport.request<AllowedIpMutationResponse>({
      method: "POST",
      path: "/add/allowed_ip",
      body: req,
    });
  },
  delete(req) {
    return transport.request<AllowedIpMutationResponse>({
      method: "POST",
      path: "/delete/allowed_ip",
      body: req,
    });
  },
});
