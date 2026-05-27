import { assert, assertStrictEquals } from "@std/assert";
import { e2eTest } from "./_helpers.ts";

// The proxy stubs `/api/event_logging/batch` so Claude Code telemetry
// doesn't 404. The stub returns `{ status: "ok" }` regardless of body.

e2eTest("anthropicEventLogging.batch posts telemetry and returns ok", async ({ client }) => {
  const result = await client.anthropicEventLogging.batch({
    events: [
      { event_type: "test", timestamp: new Date().toISOString() },
    ],
  });

  assert(result.ok, `expected ok, got ${JSON.stringify(result)}`);
  assertStrictEquals(result.value.status, "ok");
});

e2eTest("anthropicEventLogging.batch accepts an empty events array", async ({ client }) => {
  const result = await client.anthropicEventLogging.batch({ events: [] });
  assert(result.ok, `expected ok, got ${JSON.stringify(result)}`);
  assertStrictEquals(result.value.status, "ok");
});
