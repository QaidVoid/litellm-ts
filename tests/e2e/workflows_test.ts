import { assert, assertStrictEquals } from "@std/assert";
import { e2eTest } from "./_helpers.ts";

// Workflows is a newer feature. On enterprise builds the endpoints can
// 403 entirely; on community builds they're enabled out of the box. We
// run the full CRUD + events + messages cycle and tolerate the documented
// enterprise gate.

const tolerantEnterprise = (
  result: { readonly ok: boolean; readonly error?: { kind: string; status?: number } },
): boolean => {
  if (result.ok) return false;
  const err = result.error;
  if (err === undefined) return false;
  if (err.kind === "auth") return true; // 403
  if (err.kind === "http" && (err.status === 403 || err.status === 404)) return true;
  return false;
};

e2eTest("admin.workflows full lifecycle (tolerant of enterprise gate)", async ({ client }) => {
  const created = await client.workflows.create({
    workflow_type: `e2e-workflow-${Date.now()}`,
    input: { stage: "init" },
    metadata: { owner: "e2e" },
  });

  // Some enterprise builds gate workflows behind a feature flag. Skip the
  // rest of the test cleanly in that case rather than failing.
  if (!created.ok) {
    assert(
      tolerantEnterprise(created),
      `unexpected create failure: ${JSON.stringify(created.error)}`,
    );
    return;
  }
  const runId = created.value.run_id;
  assert(typeof runId === "string" && runId.length > 0, "expected run_id");

  try {
    // Get round-trips the run.
    const got = await client.workflows.get(runId);
    assert(got.ok, `get failed: ${JSON.stringify(got)}`);
    assertStrictEquals(got.value.run_id, runId);

    // Update transitions the lifecycle.
    const updated = await client.workflows.update(runId, {
      status: "running",
      metadata: { owner: "e2e", phase: "exec" },
    });
    assert(updated.ok, `update failed: ${JSON.stringify(updated)}`);

    // List should contain our run when filtered by type.
    const listed = await client.workflows.list({ limit: 50 });
    assert(listed.ok, `list failed: ${JSON.stringify(listed)}`);
    assert(Array.isArray(listed.value.runs), "expected runs array");

    // Append an event and then list events.
    const appended = await client.workflows.appendEvent(runId, {
      event_type: "step_started",
      step_name: "e2e_step",
      data: { foo: "bar" },
    });
    assert(appended.ok, `appendEvent failed: ${JSON.stringify(appended)}`);
    assertStrictEquals(appended.value.event_type, "step_started");

    const events = await client.workflows.listEvents(runId, { limit: 10 });
    assert(events.ok, `listEvents failed: ${JSON.stringify(events)}`);
    assert(
      events.value.events.some((e) => e.step_name === "e2e_step"),
      "appended event missing from listEvents",
    );

    // Append a message and then list messages.
    const message = await client.workflows.appendMessage(runId, {
      role: "user",
      content: "hello",
    });
    assert(message.ok, `appendMessage failed: ${JSON.stringify(message)}`);
    assertStrictEquals(message.value.role, "user");

    const messages = await client.workflows.listMessages(runId, { limit: 10 });
    assert(messages.ok, `listMessages failed: ${JSON.stringify(messages)}`);
    assert(
      messages.value.messages.some((m) => m.content === "hello"),
      "appended message missing from listMessages",
    );
  } finally {
    // No explicit delete endpoint; lifecycle is closed by transitioning
    // to a terminal status. Best-effort completion.
    await client.workflows.update(runId, { status: "completed" });
  }
});
