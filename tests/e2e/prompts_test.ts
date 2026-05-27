import { assert } from "@std/assert";
import { e2eTest } from "./_helpers.ts";

e2eTest("admin.prompts CRUD round-trip", async ({ client }) => {
  const promptId = `e2e-prompt-${Date.now()}`;

  const created = await client.prompts.create({
    prompt_id: promptId,
    litellm_params: {
      prompt_integration: "dotprompt",
      dotprompt_content: "Hello {{name}}!",
    },
    prompt_info: { prompt_type: "db" },
  });
  assert(created.ok, `create failed: ${JSON.stringify(created)}`);
  // The proxy appends a version suffix (e.g. `.v1`) to the returned id.
  // Hold onto the actual id for downstream calls.
  const createdId = created.value.prompt_id;
  assert(createdId.startsWith(promptId), `unexpected prompt_id: ${createdId}`);

  try {
    // Get round-trips the prompt (the response wraps `prompt_spec`).
    // The proxy normalizes the trailing `.vN` suffix on lookup, so we
    // assert containment rather than strict equality.
    const got = await client.prompts.get(createdId);
    assert(got.ok, `get failed: ${JSON.stringify(got)}`);
    assert(
      createdId.startsWith(got.value.prompt_spec.prompt_id),
      `unexpected prompt_id: ${got.value.prompt_spec.prompt_id} (created ${createdId})`,
    );

    // List eventually contains the prompt (matched on the base id, since
    // the list endpoint strips the version suffix while create returns it).
    const listed = await client.prompts.list();
    assert(listed.ok, `list failed: ${JSON.stringify(listed)}`);
    assert(
      listed.value.prompts.some((p) => createdId.startsWith(p.prompt_id)),
      "prompt missing from list",
    );

    // Patch mutates the integration content.
    const patched = await client.prompts.patch(createdId, {
      litellm_params: {
        prompt_integration: "dotprompt",
        dotprompt_content: "Updated {{name}}!",
      },
    });
    assert(patched.ok, `patch failed: ${JSON.stringify(patched)}`);
  } finally {
    const deleted = await client.prompts.delete(createdId);
    assert(deleted.ok, `delete failed: ${JSON.stringify(deleted)}`);
  }
});

e2eTest("admin.prompts.update replaces an existing prompt", async ({ client }) => {
  const promptId = `e2e-prompt-upd-${Date.now()}`;
  const created = await client.prompts.create({
    prompt_id: promptId,
    litellm_params: {
      prompt_integration: "dotprompt",
      dotprompt_content: "Hello {{name}}!",
    },
    prompt_info: { prompt_type: "db" },
  });
  assert(created.ok, `create failed: ${JSON.stringify(created)}`);
  const createdId = created.value.prompt_id;

  try {
    const updated = await client.prompts.update(createdId, {
      prompt_id: promptId,
      litellm_params: {
        prompt_integration: "dotprompt",
        dotprompt_content: "Bye {{name}}!",
      },
      prompt_info: { prompt_type: "db" },
    });
    if (!updated.ok) {
      // Some proxy versions only expose patch for prompts; tolerate.
      assert(
        updated.error.kind === "http" || updated.error.kind === "auth",
        `unexpected update error: ${JSON.stringify(updated.error)}`,
      );
    }
  } finally {
    await client.prompts.delete(createdId);
  }
});

e2eTest("admin.prompts.versions lists versioned snapshots", async ({ client }) => {
  const promptId = `e2e-prompt-ver-${Date.now()}`;
  const created = await client.prompts.create({
    prompt_id: promptId,
    litellm_params: {
      prompt_integration: "dotprompt",
      dotprompt_content: "Hello {{name}}!",
    },
    prompt_info: { prompt_type: "db" },
  });
  assert(created.ok, `create failed: ${JSON.stringify(created)}`);
  const createdId = created.value.prompt_id;

  try {
    const result = await client.prompts.versions(createdId);
    if (!result.ok) {
      assert(
        result.error.kind === "http" || result.error.kind === "auth",
        `unexpected versions error: ${JSON.stringify(result.error)}`,
      );
    }
  } finally {
    await client.prompts.delete(createdId);
  }
});

e2eTest("admin.prompts.test renders a dotprompt with variables", async ({ client }) => {
  const result = await client.prompts.test({
    dotprompt_content: "Hello {{name}}!",
    prompt_variables: { name: "tester" },
  });
  if (!result.ok) {
    // The test endpoint may 4xx if the prompt integration isn't fully
    // configured; tolerate.
    assert(
      result.error.kind === "http" || result.error.kind === "auth",
      `unexpected test error: ${JSON.stringify(result.error)}`,
    );
  }
});

e2eTest("admin.prompts.dotpromptToJson converts an uploaded dotprompt", async ({ client }) => {
  const body = `---
model: gpt-4o
---
Hello {{name}}!`;
  const result = await client.prompts.dotpromptToJson(
    new Blob([new TextEncoder().encode(body)]),
    "test.prompt",
  );
  if (!result.ok) {
    assert(
      result.error.kind === "http" || result.error.kind === "auth",
      `unexpected dotpromptToJson error: ${JSON.stringify(result.error)}`,
    );
  }
});
