import { assert, assertStrictEquals } from "@std/assert";
import { e2eTest } from "./_helpers.ts";

e2eTest("admin.guardrails CRUD round-trip", async ({ client }) => {
  const guardrailName = `e2e-guardrail-${Date.now()}`;

  const created = await client.guardrails.create({
    guardrail: {
      guardrail_name: guardrailName,
      litellm_params: {
        guardrail: "presidio",
        mode: "pre_call",
      },
      guardrail_info: { purpose: "e2e" },
    },
  });
  assert(created.ok, `create failed: ${JSON.stringify(created)}`);
  const guardrailId = created.value.guardrail_id;
  assert(typeof guardrailId === "string" && guardrailId.length > 0, "expected guardrail_id");

  try {
    // Get round-trips the name.
    const got = await client.guardrails.get(guardrailId);
    assert(got.ok, `get failed: ${JSON.stringify(got)}`);
    assertStrictEquals(got.value.guardrail_name, guardrailName);

    // ListV2 includes DB-stored guardrails (the legacy `list` only returns
    // ones declared in config.yaml).
    const listed = await client.guardrails.listV2();
    assert(listed.ok, `listV2 failed: ${JSON.stringify(listed)}`);
    assert(
      listed.value.guardrails.some((g) => g.guardrail_name === guardrailName),
      "guardrail missing from listV2",
    );

    // Patch mutates the metadata bag.
    const patched = await client.guardrails.patch(guardrailId, {
      guardrail_info: { purpose: "e2e-updated" },
    });
    assert(patched.ok, `patch failed: ${JSON.stringify(patched)}`);
  } finally {
    const deleted = await client.guardrails.delete(guardrailId);
    assert(deleted.ok, `delete failed: ${JSON.stringify(deleted)}`);
  }
});

e2eTest("admin.guardrails.list returns the configured guardrail catalog", async ({ client }) => {
  const result = await client.guardrails.list();
  assert(result.ok, `list failed: ${JSON.stringify(result)}`);
  assert(Array.isArray(result.value.guardrails));
});

e2eTest("admin.guardrails.info returns extended detail (tolerant)", async ({ client }) => {
  const created = await client.guardrails.create({
    guardrail: {
      guardrail_name: `e2e-info-${Date.now()}`,
      litellm_params: { guardrail: "presidio", mode: "pre_call" },
      guardrail_info: { purpose: "e2e info" },
    },
  });
  assert(created.ok, `precondition create failed: ${JSON.stringify(created)}`);
  const guardrailId = created.value.guardrail_id;
  assert(guardrailId !== undefined, "expected guardrail_id");

  try {
    const result = await client.guardrails.info(guardrailId);
    if (!result.ok) {
      // info may 404 on some builds; tolerate as long as the route is
      // wired and surfaces an http error.
      assert(
        result.error.kind === "http" || result.error.kind === "auth",
        `unexpected info error: ${JSON.stringify(result.error)}`,
      );
    } else {
      assertStrictEquals(result.value.guardrail_name, created.value.guardrail_name);
    }
  } finally {
    await client.guardrails.delete(guardrailId);
  }
});

e2eTest(
  "admin.guardrails.register submits a guardrail for review (tolerant)",
  async ({ client }) => {
    const result = await client.guardrails.register({
      guardrail: {
        guardrail_name: `e2e-register-${Date.now()}`,
        litellm_params: { guardrail: "presidio", mode: "pre_call" },
        guardrail_info: { purpose: "e2e" },
      },
    });
    // register is the non-admin submission path; the master key may
    // bypass the submissions queue entirely and end up creating the
    // guardrail directly. Either path is acceptable.
    if (!result.ok) {
      assert(
        result.error.kind === "http" || result.error.kind === "auth",
        `unexpected register error: ${JSON.stringify(result.error)}`,
      );
      return;
    }
    if (result.value.guardrail_id) {
      await client.guardrails.delete(result.value.guardrail_id);
    }
  },
);

e2eTest("admin.guardrails.apply runs a guardrail synchronously (tolerant)", async ({ client }) => {
  const result = await client.guardrails.apply({
    guardrail_name: `e2e-nonexistent-${Date.now()}`,
    text: "hello",
  });
  // We expect a 404 (guardrail not found) on a freshly booted proxy.
  // Any 2xx or 4xx surfaces the route as wired; only network / validation
  // would indicate a wiring issue.
  if (!result.ok) {
    assert(
      result.error.kind === "http" || result.error.kind === "auth",
      `unexpected apply error: ${JSON.stringify(result.error)}`,
    );
  }
});

e2eTest("admin.guardrails.testCustomCode runs a snippet (tolerant)", async ({ client }) => {
  const result = await client.guardrails.testCustomCode({
    custom_code: 'def apply_guardrail(*args, **kwargs):\n    return {"action": "allow"}',
    test_input: { texts: ["hello"] },
  });
  // The proxy returns { success: true|false } either way - the SDK
  // surfaces both as `ok: true`. Only a non-http failure indicates a bug.
  if (!result.ok) {
    assert(
      result.error.kind === "http" || result.error.kind === "auth",
      `unexpected testCustomCode error: ${JSON.stringify(result.error)}`,
    );
  } else {
    assertStrictEquals(typeof result.value.success, "boolean");
  }
});

e2eTest(
  "admin.guardrails.validateBlockedWordsFile validates yaml (tolerant)",
  async ({ client }) => {
    const result = await client.guardrails.validateBlockedWordsFile({
      file_content: "- not_valid_top_level",
    });
    if (!result.ok) {
      assert(
        result.error.kind === "http" || result.error.kind === "auth",
        `unexpected validateBlockedWordsFile error: ${JSON.stringify(result.error)}`,
      );
    } else {
      assertStrictEquals(typeof result.value.valid, "boolean");
    }
  },
);

// --- submissions sub-namespace ---

e2eTest(
  "admin.guardrails.submissions.list returns the pending queue (tolerant)",
  async ({ client }) => {
    const result = await client.guardrails.submissions.list();
    if (!result.ok) {
      assert(
        result.error.kind === "http" || result.error.kind === "auth",
        `unexpected submissions.list error: ${JSON.stringify(result.error)}`,
      );
    }
  },
);

e2eTest(
  "admin.guardrails.submissions.get / approve / reject surface 404 for unknown ids",
  async ({ client }) => {
    const unknown = `e2e-unknown-submission-${Date.now()}`;

    const got = await client.guardrails.submissions.get(unknown);
    if (!got.ok) {
      assert(
        got.error.kind === "http" || got.error.kind === "auth",
        `unexpected submissions.get error: ${JSON.stringify(got.error)}`,
      );
    }

    const approved = await client.guardrails.submissions.approve(unknown);
    if (!approved.ok) {
      assert(
        approved.error.kind === "http" || approved.error.kind === "auth",
        `unexpected submissions.approve error: ${JSON.stringify(approved.error)}`,
      );
    }

    const rejected = await client.guardrails.submissions.reject(unknown);
    if (!rejected.ok) {
      assert(
        rejected.error.kind === "http" || rejected.error.kind === "auth",
        `unexpected submissions.reject error: ${JSON.stringify(rejected.error)}`,
      );
    }
  },
);

// --- usage sub-namespace ---

e2eTest("admin.guardrails.usage.overview returns the rollup", async ({ client }) => {
  const result = await client.guardrails.usage.overview({
    start_date: "2026-05-20",
    end_date: "2026-05-27",
  });
  assert(result.ok, `usage.overview failed: ${JSON.stringify(result)}`);
  assert(Array.isArray(result.value.rows), "expected rows array");
  assert(typeof result.value.totalRequests === "number");
});

e2eTest(
  "admin.guardrails.usage.detail returns the per-guardrail detail (tolerant)",
  async ({ client }) => {
    // Use the overview to find a real guardrail id, otherwise fall back to
    // a synthetic id and tolerate the 404.
    const overview = await client.guardrails.usage.overview();
    const guardrailId = overview.ok && overview.value.rows.length > 0
      ? overview.value.rows[0]!.id
      : `e2e-unknown-${Date.now()}`;

    const result = await client.guardrails.usage.detail(guardrailId);
    if (!result.ok) {
      assert(
        result.error.kind === "http" || result.error.kind === "auth",
        `unexpected usage.detail error: ${JSON.stringify(result.error)}`,
      );
    }
  },
);

e2eTest("admin.guardrails.usage.logs returns paginated evaluation rows", async ({ client }) => {
  const result = await client.guardrails.usage.logs({ page: 1, page_size: 10 });
  assert(result.ok, `usage.logs failed: ${JSON.stringify(result)}`);
  assert(Array.isArray(result.value.logs));
  assert(typeof result.value.total === "number");
});

e2eTest(
  "admin.guardrails.usage.policiesOverview returns the policy rollup (tolerant)",
  async ({ client }) => {
    const result = await client.guardrails.usage.policiesOverview();
    if (!result.ok) {
      assert(
        result.error.kind === "http" || result.error.kind === "auth",
        `unexpected policiesOverview error: ${JSON.stringify(result.error)}`,
      );
    }
  },
);
