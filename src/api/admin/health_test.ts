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

Deno.test("health.liveliness GETs /health/liveliness and returns the body string", async () => {
  const { fetch, calls } = recordingFetch([
    () =>
      new Response(JSON.stringify("I'm alive!"), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  ]);
  const client = baseClient(fetch);
  const result = await client.health.liveliness();
  assertEquals(result, { ok: true, value: "I'm alive!" });
  assertStrictEquals(calls[0]?.init?.method, "GET");
  assertStrictEquals(calls[0]?.input, "https://api.test/health/liveliness");
});

Deno.test("health.readiness reports the proxy status and db state", async () => {
  const { fetch } = recordingFetch([
    () =>
      new Response(JSON.stringify({ status: "healthy", db: "connected" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  ]);
  const client = baseClient(fetch);
  const result = await client.health.readiness();
  assertEquals(result, { ok: true, value: { status: "healthy", db: "connected" } });
});

Deno.test("health.testConnection forwards litellm_params to /health/test_connection", async () => {
  const { fetch, calls } = recordingFetch([
    () =>
      new Response(JSON.stringify({ status: "success" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  ]);
  const client = baseClient(fetch);
  await client.health.testConnection({
    litellm_params: { model: "openai/gpt-4o" },
    mode: "chat",
  });
  const body = JSON.parse(calls[0]?.init?.body as string);
  assertEquals(body, { litellm_params: { model: "openai/gpt-4o" }, mode: "chat" });
});
