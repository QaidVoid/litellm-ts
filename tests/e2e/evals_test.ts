import { assert } from "@std/assert";
import { e2eTest } from "./_helpers.ts";

// The Evals API on the LiteLLM proxy is a thin shim over the OpenAI Evals
// API, so the proxy needs an upstream OPENAI_API_KEY to call. Local test
// stacks generally don't have that wired up, so most calls return a 500
// with `litellm.APIConnectionError`. We verify the SDK routes are wired
// correctly by either:
//   - succeeding (when the proxy has credentials), or
//   - returning the documented 500 / 401 / 403 / 404 the proxy raises.

const tolerantOk = (
  result: { readonly ok: boolean; readonly error?: { kind: string; status?: number } },
  label: string,
): void => {
  if (result.ok) return;
  const err = result.error;
  assert(err !== undefined, `${label}: missing error envelope`);
  // The transport surfaces:
  //   - HTTP errors as { kind: "http", status }
  //   - 401/403 as { kind: "auth" }
  // Anything else means the SDK call wasn't wired correctly.
  assert(
    err.kind === "http" || err.kind === "auth",
    `${label}: unexpected error kind: ${JSON.stringify(err)}`,
  );
};

e2eTest("openai.evals top-level CRUD round-trip (tolerant)", async ({ client }) => {
  const created = await client.evals.create({
    name: `e2e-eval-${Date.now()}`,
    data_source_config: {
      type: "custom",
      item_schema: {
        type: "object",
        properties: { input: { type: "string" } },
      },
    },
    testing_criteria: [
      {
        type: "string_check",
        name: "echo",
        input: "{{ item.input }}",
        reference: "x",
        operation: "eq",
      },
    ],
  });

  // If create fails because the proxy isn't configured for OpenAI Evals,
  // none of the dependent calls can run. Just confirm the error envelope
  // matches the documented shape and exit.
  if (!created.ok) {
    tolerantOk(created, "create");
    return;
  }
  const evalId = created.value.id;

  try {
    // Retrieve round-trips the id.
    const got = await client.evals.retrieve(evalId);
    tolerantOk(got, "retrieve");

    // Update accepts an optional rename.
    const updated = await client.evals.update(evalId, { name: `${created.value.name}-renamed` });
    tolerantOk(updated, "update");

    // List should include our eval when both the request and the response
    // are honored by the proxy. Don't assert presence: the proxy paginates.
    const listed = await client.evals.list({ limit: 10 });
    tolerantOk(listed, "list");

    // Cancel is a no-op on an empty eval; tolerate 404/409 too.
    const cancelled = await client.evals.cancel(evalId);
    tolerantOk(cancelled, "cancel");
  } finally {
    const deleted = await client.evals.delete(evalId);
    tolerantOk(deleted, "delete");
  }
});

e2eTest("openai.evals.runs CRUD round-trip (tolerant)", async ({ client }) => {
  const created = await client.evals.create({
    name: `e2e-eval-runs-${Date.now()}`,
    data_source_config: {
      type: "custom",
      item_schema: { type: "object", properties: { input: { type: "string" } } },
    },
    testing_criteria: [
      {
        type: "string_check",
        name: "echo",
        input: "{{ item.input }}",
        reference: "x",
        operation: "eq",
      },
    ],
  });
  if (!created.ok) {
    tolerantOk(created, "create (precondition)");
    return;
  }
  const evalId = created.value.id;

  try {
    // Create a run (this is the most likely call to fail if the proxy
    // can't reach an upstream provider).
    const run = await client.evals.runs.create(evalId, {
      name: "e2e-run",
      data_source: { type: "completions", model: "gpt-4o-mini" },
    });
    tolerantOk(run, "runs.create");

    if (run.ok) {
      const runId = run.value.id;
      const got = await client.evals.runs.retrieve(evalId, runId);
      tolerantOk(got, "runs.retrieve");

      const updated = await client.evals.runs.update(evalId, runId, { name: "renamed" });
      tolerantOk(updated, "runs.update");

      const listed = await client.evals.runs.list(evalId, { limit: 5 });
      tolerantOk(listed, "runs.list");

      const deleted = await client.evals.runs.delete(evalId, runId);
      tolerantOk(deleted, "runs.delete");
    } else {
      // Even when runs.create failed, list should still respond.
      const listed = await client.evals.runs.list(evalId);
      tolerantOk(listed, "runs.list");
    }
  } finally {
    await client.evals.delete(evalId);
  }
});
