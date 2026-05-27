import { assert, assertStrictEquals } from "@std/assert";
import { e2eTest } from "./_helpers.ts";

e2eTest("admin.users CRUD round-trip", async ({ client }) => {
  const userId = `e2e-user-${Date.now()}`;
  const email = `${userId}@example.test`;

  const created = await client.users.create({
    user_id: userId,
    user_email: email,
    user_role: "internal_user",
    auto_create_key: false,
    max_budget: 1.0,
  });
  assert(created.ok, `create failed: ${JSON.stringify(created)}`);

  try {
    // Info by user_id matches the email we set (wrapped in `user_info`).
    const info = await client.users.info({ user_id: userId });
    assert(info.ok, `info failed: ${JSON.stringify(info)}`);
    assertStrictEquals(info.value.user_info.user_email, email);

    // Update extends the budget.
    const updated = await client.users.update({ user_id: userId, max_budget: 2.0 });
    assert(updated.ok, `update failed: ${JSON.stringify(updated)}`);

    // List finds the user.
    const listed = await client.users.list({ user_id: userId });
    assert(listed.ok);
    assert(
      listed.value.users.some((u) => u.user_id === userId),
      "user missing from list",
    );
  } finally {
    const deleted = await client.users.delete({ user_ids: [userId] });
    assert(deleted.ok, `delete failed: ${JSON.stringify(deleted)}`);
  }
});

e2eTest("admin.users.availableRoles returns the role catalog", async ({ client }) => {
  const result = await client.users.availableRoles();
  assert(result.ok, `availableRoles failed: ${JSON.stringify(result)}`);
  // The catalog is keyed by role name (e.g. "proxy_admin"); ensure non-empty.
  assert(Object.keys(result.value).length > 0, "expected non-empty role catalog");
});
