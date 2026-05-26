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

Deno.test("spend.calculate POSTs to /spend/calculate with the request body", async () => {
  const { fetch, calls } = recordingFetch([
    () =>
      new Response(JSON.stringify({ cost: 0.012 }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  ]);
  const client = baseClient(fetch);
  const result = await client.spend.calculate({
    model: "gpt-4o",
    completion_response: { usage: { prompt_tokens: 100, completion_tokens: 50 } },
  });
  assertEquals(result, { ok: true, value: { cost: 0.012 } });
  assertStrictEquals(calls[0]?.input, "https://api.test/spend/calculate");
});

Deno.test("spend.logs serializes filters into the query string", async () => {
  const { fetch, calls } = recordingFetch([
    () =>
      new Response(JSON.stringify({ logs: [], total_count: 0 }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  ]);
  const client = baseClient(fetch);
  await client.spend.logs({ team_id: "t1", start_date: "2026-01-01", limit: 100 });
  const url = new URL(calls[0]?.input as string);
  assertStrictEquals(url.pathname, "/spend/logs");
  assertStrictEquals(url.searchParams.get("team_id"), "t1");
  assertStrictEquals(url.searchParams.get("start_date"), "2026-01-01");
  assertStrictEquals(url.searchParams.get("limit"), "100");
});
