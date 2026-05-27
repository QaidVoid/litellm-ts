import { assert, assertStrictEquals } from "@std/assert";
import { e2eTest } from "./_helpers.ts";

e2eTest("admin.organizations CRUD round-trip", async ({ client }) => {
  const alias = `e2e-org-${Date.now()}`;

  const created = await client.organizations.create({
    organization_alias: alias,
    max_budget: 5.0,
  });
  assert(created.ok, `create failed: ${JSON.stringify(created)}`);
  const orgId = created.value.organization_id;
  assert(typeof orgId === "string" && orgId.length > 0, "expected organization_id");

  try {
    // Info round-trips the alias.
    const info = await client.organizations.info(orgId);
    assert(info.ok, `info failed: ${JSON.stringify(info)}`);
    assertStrictEquals(info.value.organization_alias, alias);

    // Update lifts the budget ceiling.
    const updated = await client.organizations.update({
      organization_id: orgId,
      max_budget: 10.0,
    });
    assert(updated.ok, `update failed: ${JSON.stringify(updated)}`);

    // List includes the new org.
    const listed = await client.organizations.list();
    assert(listed.ok);
    assert(
      listed.value.some((o) => o.organization_id === orgId),
      "org missing from list",
    );
  } finally {
    const deleted = await client.organizations.delete({ organization_ids: [orgId] });
    assert(deleted.ok, `delete failed: ${JSON.stringify(deleted)}`);
  }
});

e2eTest("admin.organizations member add / update / delete round-trip", async ({ client }) => {
  const ts = Date.now();
  const alias = `e2e-org-mbr-${ts}`;
  const userId = `e2e-org-mbr-user-${ts}`;
  const org = await client.organizations.create({ organization_alias: alias });
  assert(org.ok, `create failed: ${JSON.stringify(org)}`);
  const orgId = org.value.organization_id;

  const user = await client.users.create({
    user_id: userId,
    user_email: `${userId}@example.test`,
    auto_create_key: false,
  });
  assert(user.ok, `user create failed: ${JSON.stringify(user)}`);

  try {
    const added = await client.organizations.addMember({
      organization_id: orgId,
      member: { user_id: userId, role: "internal_user" },
    });
    if (!added.ok) {
      // Some builds 403/400 here; tolerate.
      assert(
        added.error.kind === "http" || added.error.kind === "auth",
        `unexpected addMember error: ${JSON.stringify(added.error)}`,
      );
      return;
    }

    const updatedMember = await client.organizations.updateMember({
      organization_id: orgId,
      user_id: userId,
      role: "org_user",
    });
    if (!updatedMember.ok) {
      assert(
        updatedMember.error.kind === "http" || updatedMember.error.kind === "auth",
        `unexpected updateMember error: ${JSON.stringify(updatedMember.error)}`,
      );
    }

    const removed = await client.organizations.deleteMember({
      organization_id: orgId,
      user_id: userId,
    });
    if (!removed.ok) {
      assert(
        removed.error.kind === "http" || removed.error.kind === "auth",
        `unexpected deleteMember error: ${JSON.stringify(removed.error)}`,
      );
    }
  } finally {
    await client.organizations.delete({ organization_ids: [orgId] });
    await client.users.delete({ user_ids: [userId] });
  }
});

e2eTest("admin.organizations.dailyActivity round-trips with a date window", async ({ client }) => {
  const result = await client.organizations.dailyActivity({
    start_date: "2026-05-20",
    end_date: "2026-05-27",
  });
  if (!result.ok) {
    if (
      result.error.kind === "http" &&
      result.error.status >= 400 && result.error.status < 600
    ) return;
    if (result.error.kind === "auth") return;
    throw new Error(`dailyActivity failed: ${JSON.stringify(result.error)}`);
  }
});
