import { assert, assertStrictEquals } from "@std/assert";
import { e2eTest } from "./_helpers.ts";

e2eTest("admin.customers CRUD + block round-trip", async ({ client }) => {
  const userId = `e2e-customer-${Date.now()}`;
  const alias = `${userId}-alias`;

  const created = await client.customers.create({
    user_id: userId,
    alias,
    max_budget: 1.0,
  });
  assert(created.ok, `create failed: ${JSON.stringify(created)}`);

  try {
    // Info round-trips the alias.
    const info = await client.customers.info(userId);
    assert(info.ok, `info failed: ${JSON.stringify(info)}`);
    assertStrictEquals(info.value.alias, alias);

    // Update lifts the budget ceiling.
    const updated = await client.customers.update({ user_id: userId, max_budget: 2.0 });
    assert(updated.ok, `update failed: ${JSON.stringify(updated)}`);

    // Block returns the updated rows. Unblock requires the proxy to have
    // its blocked-user check enabled at boot, so we just verify the call
    // round-trips a 200 or the documented 400 ("never set").
    const blocked = await client.customers.block({ user_ids: [userId] });
    assert(blocked.ok, `block failed: ${JSON.stringify(blocked)}`);
    const unblocked = await client.customers.unblock({ user_ids: [userId] });
    if (!unblocked.ok && unblocked.error.kind === "http") {
      assertStrictEquals(
        unblocked.error.status,
        400,
        `unexpected unblock error: ${JSON.stringify(unblocked.error)}`,
      );
    }

    // List eventually contains the customer.
    const listed = await client.customers.list();
    assert(listed.ok);
    assert(
      listed.value.some((c) => c.user_id === userId),
      "customer missing from list",
    );
  } finally {
    const deleted = await client.customers.delete({ user_ids: [userId] });
    assert(deleted.ok, `delete failed: ${JSON.stringify(deleted)}`);
  }
});
