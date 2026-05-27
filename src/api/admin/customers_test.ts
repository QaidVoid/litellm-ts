import { assertEquals, assertStrictEquals } from "@std/assert";
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

Deno.test("customers.create POSTs to /customer/new", async () => {
  const { fetch, calls } = recordingFetch([
    () =>
      new Response(JSON.stringify({ user_id: "u-1", blocked: false }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  ]);
  const client = baseClient(fetch);
  const result = await client.customers.create({ user_id: "u-1", max_budget: 5 });
  assertEquals(result, { ok: true, value: { user_id: "u-1", blocked: false } });
  assertStrictEquals(calls[0]?.input, "https://api.test/customer/new");
});

Deno.test("customers.info passes end_user_id as a query parameter", async () => {
  const { fetch, calls } = recordingFetch([
    () =>
      new Response(JSON.stringify({ user_id: "u-1", blocked: false }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  ]);
  const client = baseClient(fetch);
  await client.customers.info("u-1");
  const url = new URL(calls[0]?.input as string);
  assertStrictEquals(url.searchParams.get("end_user_id"), "u-1");
});

Deno.test("customers.block posts user_ids to /customer/block", async () => {
  const { fetch, calls } = recordingFetch([
    () =>
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  ]);
  const client = baseClient(fetch);
  await client.customers.block({ user_ids: ["u-1", "u-2"] });
  const body = JSON.parse(calls[0]?.init?.body as string);
  assertEquals(body, { user_ids: ["u-1", "u-2"] });
  assertStrictEquals(calls[0]?.input, "https://api.test/customer/block");
});
