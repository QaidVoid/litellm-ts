import { assert, assertEquals, assertStrictEquals } from "@std/assert";
import { createClient } from "../../client.ts";

const recordingFetch = (
  responses: ReadonlyArray<() => Response | Promise<Response>>,
): {
  fetch: typeof fetch;
  calls: Array<{ input: string | URL | Request; init: RequestInit | undefined }>;
} => {
  const calls: Array<{ input: string | URL | Request; init: RequestInit | undefined }> = [];
  let i = 0;
  const fetchFn: typeof fetch = (input, init) => {
    calls.push({ input, init });
    const make = responses[i++];
    if (make === undefined) throw new Error(`mock fetch exhausted at call ${i}`);
    return Promise.resolve(make());
  };
  return { fetch: fetchFn, calls };
};

const baseClient = (fetchFn: typeof fetch) =>
  createClient({ baseUrl: "https://api.test", apiKey: "test", maxRetries: 0, fetch: fetchFn });

Deno.test("budgets.create POSTs to /budget/new with the request body", async () => {
  const { fetch, calls } = recordingFetch([
    () =>
      new Response(JSON.stringify({ budget_id: "b-1", max_budget: 100 }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  ]);
  const client = baseClient(fetch);
  const result = await client.budgets.create({ max_budget: 100, budget_duration: "30d" });
  assertEquals(result, { ok: true, value: { budget_id: "b-1", max_budget: 100 } });
  assertStrictEquals(calls[0]?.input, "https://api.test/budget/new");
});

Deno.test("budgets.info posts a single-id batch to /budget/info and unwraps the first match", async () => {
  const { fetch, calls } = recordingFetch([
    () =>
      new Response(JSON.stringify([{ budget_id: "b-1" }]), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  ]);
  const client = baseClient(fetch);
  const result = await client.budgets.info("b-1");
  assertStrictEquals(calls[0]?.input, "https://api.test/budget/info");
  const body = JSON.parse(calls[0]?.init?.body as string);
  assertEquals(body, { budgets: ["b-1"] });
  assert(result.ok);
  assertStrictEquals(result.value.budget_id, "b-1");
});

Deno.test("budgets.info surfaces a 404-shaped error when the proxy returns an empty array", async () => {
  const { fetch } = recordingFetch([
    () =>
      new Response("[]", {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  ]);
  const client = baseClient(fetch);
  const result = await client.budgets.info("missing");
  assert(!result.ok);
  assertStrictEquals(result.error.kind, "http");
  if (result.error.kind === "http") assertStrictEquals(result.error.status, 404);
});

Deno.test("budgets.delete posts the id to /budget/delete", async () => {
  const { fetch, calls } = recordingFetch([
    () =>
      new Response(JSON.stringify({ status: "success" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  ]);
  const client = baseClient(fetch);
  await client.budgets.delete({ id: "b-1" });
  const body = JSON.parse(calls[0]?.init?.body as string);
  assertEquals(body, { id: "b-1" });
});
