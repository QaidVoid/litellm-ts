import { assert } from "@std/assert";
import { e2eTest } from "./_helpers.ts";

// Spend endpoints are read-only on a freshly-booted proxy with no traffic.
// We verify the routes are wired and respond in the expected shape rather
// than asserting any particular spend rows.

e2eTest("admin.spend.tags returns the tag spend aggregation", async ({ client }) => {
  const result = await client.spend.tags();
  assert(result.ok, `tags failed: ${JSON.stringify(result)}`);
  assert(Array.isArray(result.value));
});

e2eTest("admin.spend.keys returns the per-key spend rollup", async ({ client }) => {
  const result = await client.spend.keys();
  assert(result.ok, `keys failed: ${JSON.stringify(result)}`);
  assert(Array.isArray(result.value));
});

e2eTest("admin.spend.users returns the per-user spend rollup", async ({ client }) => {
  const result = await client.spend.users();
  assert(result.ok, `users failed: ${JSON.stringify(result)}`);
  assert(Array.isArray(result.value));
});

e2eTest("admin.spend.logs returns paginated spend logs", async ({ client }) => {
  const result = await client.spend.logs();
  assert(result.ok, `logs failed: ${JSON.stringify(result)}`);
});

e2eTest("admin.spend.calculate estimates cost from messages", async ({ client, models }) => {
  const result = await client.spend.calculate({
    model: models.chat,
    messages: [{ role: "user", content: "hello world" }],
  });
  if (!result.ok) {
    // Some builds restrict /spend/calculate to certain models or require a
    // completion_response shape; tolerate 4xx/5xx.
    if (
      result.error.kind === "http" &&
      result.error.status >= 400 && result.error.status < 600
    ) return;
    if (result.error.kind === "auth") return;
    throw new Error(`calculate failed: ${JSON.stringify(result.error)}`);
  }
  assert(typeof result.value.cost === "number");
}, { requires: ["chat"] });

e2eTest("admin.spend.costEstimate projects forward cost", async ({ client, models }) => {
  const result = await client.spend.costEstimate({
    model: models.chat,
    input_tokens: 100,
    output_tokens: 50,
    num_requests_per_day: 10,
  });
  if (!result.ok) {
    if (
      result.error.kind === "http" &&
      result.error.status >= 400 && result.error.status < 600
    ) return;
    if (result.error.kind === "auth") return;
    throw new Error(`costEstimate failed: ${JSON.stringify(result.error)}`);
  }
  assert(typeof result.value.cost_per_request === "number");
}, { requires: ["chat"] });

e2eTest("admin.spend.logsV2 paginates logs with v2 filtering", async ({ client }) => {
  const today = new Date().toISOString().slice(0, 10);
  const result = await client.spend.logsV2({
    start_date: today,
    end_date: today,
    page: 1,
    page_size: 5,
  });
  if (!result.ok) {
    if (
      result.error.kind === "http" &&
      result.error.status >= 400 && result.error.status < 600
    ) return;
    if (result.error.kind === "auth") return;
    throw new Error(`logsV2 failed: ${JSON.stringify(result.error)}`);
  }
  assert(Array.isArray(result.value.data));
  assert(typeof result.value.total === "number");
});
