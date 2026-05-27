import type { ApiError } from "../../error.ts";
import type { Result } from "../../result.ts";
import type { Transport } from "../../transport.ts";

/** Request body for `POST /invitation/new`. */
export interface CreateInvitationRequest {
  /** Id of an existing row in `LiteLLM_UserTable` to invite. */
  readonly user_id: string;
}

/** Request body for `POST /invitation/update`. */
export interface UpdateInvitationRequest {
  /** Invitation id to update. */
  readonly invitation_id: string;
  /** Mark the invitation as accepted (sets `accepted_at`). */
  readonly is_accepted: boolean;
}

/** Request body for `POST /invitation/delete`. */
export interface DeleteInvitationRequest {
  /** Invitation id to delete. */
  readonly invitation_id: string;
}

/** A single invitation row. */
export interface Invitation {
  /** Invitation id. */
  readonly id: string;
  /** Invited user id. */
  readonly user_id: string;
  /** True once the user accepted the invite. */
  readonly is_accepted: boolean;
  /** ISO-8601 acceptance timestamp, when accepted. */
  readonly accepted_at?: string | null;
  /** ISO-8601 expiration timestamp. */
  readonly expires_at: string;
  /** ISO-8601 creation timestamp. */
  readonly created_at: string;
  /** Identifier of the inviting admin. */
  readonly created_by: string;
  /** ISO-8601 last-update timestamp. */
  readonly updated_at: string;
  /** Identifier of the last user to update the row. */
  readonly updated_by: string;
}

/** Surface for invitation administration on the `Client`. */
export interface InvitationsNamespace {
  /** Create a new invitation link for an existing user. */
  create(req: CreateInvitationRequest): Promise<Result<Invitation, ApiError>>;
  /** Retrieve an invitation by id. */
  info(invitationId: string): Promise<Result<Invitation, ApiError>>;
  /** Update an invitation's acceptance state. */
  update(req: UpdateInvitationRequest): Promise<Result<Invitation, ApiError>>;
  /** Delete an invitation by id. */
  delete(req: DeleteInvitationRequest): Promise<Result<Invitation, ApiError>>;
}

/** Bind an `InvitationsNamespace` to a constructed `Transport`. */
export const createInvitations = (transport: Transport): InvitationsNamespace => ({
  create(req) {
    return transport.request<Invitation>({
      method: "POST",
      path: "/invitation/new",
      body: req,
    });
  },
  info(invitationId) {
    return transport.request<Invitation>({
      method: "GET",
      path: "/invitation/info",
      query: { invitation_id: invitationId },
    });
  },
  update(req) {
    return transport.request<Invitation>({
      method: "POST",
      path: "/invitation/update",
      body: req,
    });
  },
  delete(req) {
    return transport.request<Invitation>({
      method: "POST",
      path: "/invitation/delete",
      body: req,
    });
  },
});
