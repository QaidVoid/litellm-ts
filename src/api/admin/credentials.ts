import type { ApiError } from "../../error.ts";
import type { Result } from "../../result.ts";
import type { Transport } from "../../transport.ts";

/** Request body for `POST /credentials`. */
export interface CreateCredentialRequest {
  /** Unique name used to look up this credential later. */
  readonly credential_name: string;
  /** Provider-specific key/value pairs. Encrypted at rest by the proxy. */
  readonly credential_values?: Readonly<Record<string, unknown>>;
  /** Free-form metadata; not encrypted. */
  readonly credential_info: Readonly<Record<string, unknown>>;
  /**
   * When set, the proxy copies the credentials currently bound to this
   * deployment instead of accepting `credential_values` from the caller.
   */
  readonly model_id?: string;
}

/** Request body for `PATCH /credentials/{name}`. */
export interface UpdateCredentialRequest {
  /** Required by the upstream even when only `credential_values` change. */
  readonly credential_name: string;
  /** Replacement provider key/value pairs. */
  readonly credential_values?: Readonly<Record<string, unknown>>;
  /** Replacement metadata. */
  readonly credential_info: Readonly<Record<string, unknown>>;
}

/** A single credential record (values are masked when returned). */
export interface Credential {
  readonly credential_name: string;
  /** Masked when read from the API; cleartext only at create time. */
  readonly credential_values: Readonly<Record<string, unknown>>;
  readonly credential_info: Readonly<Record<string, unknown>>;
}

/** Response from `GET /credentials`. */
export interface ListCredentialsResponse {
  readonly success: boolean;
  readonly credentials: readonly Credential[];
}

/** Generic `{ success, message }` envelope used by mutating credential ops. */
export interface CredentialMutationResponse {
  readonly success: boolean;
  readonly message: string;
}

/** Surface for stored credential administration on the `Client`. */
export interface CredentialsNamespace {
  /** Create a new credential. */
  create(req: CreateCredentialRequest): Promise<Result<CredentialMutationResponse, ApiError>>;
  /** List every credential (values are masked). */
  list(): Promise<Result<ListCredentialsResponse, ApiError>>;
  /** Look up a credential by its name. */
  getByName(credentialName: string): Promise<Result<Credential, ApiError>>;
  /** Look up the credential currently bound to a deployment id. */
  getByModel(modelId: string): Promise<Result<Credential, ApiError>>;
  /** Update an existing credential. */
  update(
    credentialName: string,
    req: UpdateCredentialRequest,
  ): Promise<Result<CredentialMutationResponse, ApiError>>;
  /** Delete a credential by name. */
  delete(credentialName: string): Promise<Result<CredentialMutationResponse, ApiError>>;
}

const encode = (s: string) => encodeURIComponent(s);

/** Bind a `CredentialsNamespace` to a constructed `Transport`. */
export const createCredentials = (transport: Transport): CredentialsNamespace => ({
  create(req) {
    return transport.request<CredentialMutationResponse>({
      method: "POST",
      path: "/credentials",
      body: req,
    });
  },
  list() {
    return transport.request<ListCredentialsResponse>({ method: "GET", path: "/credentials" });
  },
  getByName(credentialName) {
    return transport.request<Credential>({
      method: "GET",
      path: `/credentials/by_name/${encode(credentialName)}`,
    });
  },
  getByModel(modelId) {
    return transport.request<Credential>({
      method: "GET",
      path: `/credentials/by_model/${encode(modelId)}`,
    });
  },
  update(credentialName, req) {
    return transport.request<CredentialMutationResponse>({
      method: "PATCH",
      path: `/credentials/${encode(credentialName)}`,
      body: req,
    });
  },
  delete(credentialName) {
    return transport.request<CredentialMutationResponse>({
      method: "DELETE",
      path: `/credentials/${encode(credentialName)}`,
    });
  },
});
