import { assert, assertStrictEquals } from "@std/assert";
import { e2eTest } from "./_helpers.ts";

e2eTest("admin.invitations CRUD round-trip", async ({ client }) => {
  // Invitations require an existing user row; mint a throwaway user.
  const userAlias = `e2e-inv-user-${Date.now()}`;
  const user = await client.users.create({ user_alias: userAlias });
  assert(user.ok, `user create failed: ${JSON.stringify(user)}`);
  const userId = user.value.user_id!;

  try {
    const created = await client.invitations.create({ user_id: userId });
    assert(created.ok, `create failed: ${JSON.stringify(created)}`);
    assertStrictEquals(created.value.user_id, userId);
    const invitationId = created.value.id;
    assert(typeof invitationId === "string" && invitationId.length > 0, "expected invitation id");

    try {
      // Info round-trips the invitation.
      const info = await client.invitations.info(invitationId);
      assert(info.ok, `info failed: ${JSON.stringify(info)}`);
      assertStrictEquals(info.value.id, invitationId);

      // Mark accepted via update.
      const updated = await client.invitations.update({
        invitation_id: invitationId,
        is_accepted: true,
      });
      assert(updated.ok, `update failed: ${JSON.stringify(updated)}`);
      assertStrictEquals(updated.value.is_accepted, true);
    } finally {
      const deleted = await client.invitations.delete({ invitation_id: invitationId });
      assert(deleted.ok, `delete failed: ${JSON.stringify(deleted)}`);
    }
  } finally {
    await client.users.delete({ user_ids: [userId] });
  }
});
