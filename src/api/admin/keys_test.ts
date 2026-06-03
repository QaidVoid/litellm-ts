import { assertEquals, assertStrictEquals } from "@std/assert";
import { createClient } from "../../client.ts";
import type { KeyMetadata } from "./keys.ts";

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

const sampleKey: KeyMetadata = {
  key: "sk-abc",
  key_alias: "ci",
  user_id: "u1",
  models: ["gpt-4o"],
};

Deno.test("keys.generate POSTs to /key/generate with the supplied request", async () => {
  const { fetch, calls } = recordingFetch([
    () =>
      new Response(JSON.stringify(sampleKey), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  ]);
  const client = baseClient(fetch);
  const result = await client.keys.generate({
    key_alias: "ci",
    models: ["gpt-4o"],
    duration: "30d",
  });
  assertEquals(result, { ok: true, value: sampleKey });
  assertStrictEquals(calls[0]?.input, "https://api.test/key/generate");
  const body = JSON.parse(calls[0]?.init?.body as string);
  assertEquals(body, { key_alias: "ci", models: ["gpt-4o"], duration: "30d" });
});

Deno.test("keys.info passes the key as a query string parameter", async () => {
  const { fetch, calls } = recordingFetch([
    () =>
      new Response(JSON.stringify(sampleKey), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  ]);
  const client = baseClient(fetch);
  await client.keys.info("sk-abc");
  const url = new URL(calls[0]?.input as string);
  assertStrictEquals(url.pathname, "/key/info");
  assertStrictEquals(url.searchParams.get("key"), "sk-abc");
});

Deno.test("keys.list serializes pagination and filter query parameters", async () => {
  const { fetch, calls } = recordingFetch([
    () =>
      new Response(JSON.stringify({ keys: [sampleKey], total_count: 1, page: 1, size: 10 }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  ]);
  const client = baseClient(fetch);
  await client.keys.list({ page: 2, size: 25, team_id: "team-1", return_full_object: true });
  const url = new URL(calls[0]?.input as string);
  assertStrictEquals(url.searchParams.get("page"), "2");
  assertStrictEquals(url.searchParams.get("size"), "25");
  assertStrictEquals(url.searchParams.get("team_id"), "team-1");
  assertStrictEquals(url.searchParams.get("return_full_object"), "true");
});

Deno.test("keys.delete accepts either keys or key_aliases", async () => {
  const { fetch, calls } = recordingFetch([
    () =>
      new Response(JSON.stringify({ deleted_keys: ["sk-1", "sk-2"] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  ]);
  const client = baseClient(fetch);
  await client.keys.delete({ keys: ["sk-1", "sk-2"] });
  const body = JSON.parse(calls[0]?.init?.body as string);
  assertEquals(body, { keys: ["sk-1", "sk-2"] });
});

Deno.test("keys.iterate auto-paginates by page until total_pages", async () => {
  const page1 = { keys: [{ token: "sk-1" }], total_count: 2, current_page: 1, total_pages: 2 };
  const page2 = { keys: [{ token: "sk-2" }], total_count: 2, current_page: 2, total_pages: 2 };
  const { fetch, calls } = recordingFetch([
    () => new Response(JSON.stringify(page1), { headers: { "content-type": "application/json" } }),
    () => new Response(JSON.stringify(page2), { headers: { "content-type": "application/json" } }),
  ]);
  const client = baseClient(fetch);
  let count = 0;
  for await (const r of client.keys.iterate({ size: 1 })) {
    if (r.ok) count++;
  }
  assertStrictEquals(count, 2);
  assertStrictEquals(calls.length, 2);
  assertStrictEquals(new URL(calls[1]?.input as string).searchParams.get("page"), "2");
});
