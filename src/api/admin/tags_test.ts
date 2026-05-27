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

Deno.test("tags.create POSTs to /tag/new", async () => {
  const { fetch, calls } = recordingFetch([
    () =>
      new Response(JSON.stringify({ message: "ok" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  ]);
  const client = baseClient(fetch);
  await client.tags.create({ name: "prod", models: ["gpt-4o"] });
  assertStrictEquals(calls[0]?.input, "https://api.test/tag/new");
  const body = JSON.parse(calls[0]?.init?.body as string);
  assertEquals(body, { name: "prod", models: ["gpt-4o"] });
});

Deno.test("tags.list with date range encodes both query parameters", async () => {
  const { fetch, calls } = recordingFetch([
    () =>
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  ]);
  const client = baseClient(fetch);
  await client.tags.list({ start_date: "2026-01-01", end_date: "2026-02-01" });
  const url = new URL(calls[0]?.input as string);
  assertStrictEquals(url.searchParams.get("start_date"), "2026-01-01");
  assertStrictEquals(url.searchParams.get("end_date"), "2026-02-01");
});

Deno.test("tags.info POSTs the names list to /tag/info", async () => {
  const { fetch, calls } = recordingFetch([
    () =>
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  ]);
  const client = baseClient(fetch);
  await client.tags.info({ names: ["prod", "staging"] });
  const body = JSON.parse(calls[0]?.init?.body as string);
  assertEquals(body, { names: ["prod", "staging"] });
});
