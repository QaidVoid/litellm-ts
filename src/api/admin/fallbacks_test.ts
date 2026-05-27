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

Deno.test("fallbacks.create POSTs to /fallback", async () => {
  const { fetch, calls } = recordingFetch([
    () =>
      new Response(
        JSON.stringify({
          model: "gpt-4o",
          fallback_models: ["gpt-4o-mini"],
          fallback_type: "general",
          message: "ok",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
  ]);
  const client = baseClient(fetch);
  await client.fallbacks.create({ model: "gpt-4o", fallback_models: ["gpt-4o-mini"] });
  assertStrictEquals(calls[0]?.input, "https://api.test/fallback");
});

Deno.test("fallbacks.get URL-encodes the model and accepts fallback_type", async () => {
  const { fetch, calls } = recordingFetch([
    () =>
      new Response(
        JSON.stringify({
          model: "gpt-4o",
          fallback_models: ["gpt-4o-mini"],
          fallback_type: "context_window",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
  ]);
  const client = baseClient(fetch);
  await client.fallbacks.get("openai/gpt-4o", "context_window");
  const url = new URL(calls[0]?.input as string);
  assertStrictEquals(url.pathname, "/fallback/openai%2Fgpt-4o");
  assertStrictEquals(url.searchParams.get("fallback_type"), "context_window");
});

Deno.test("fallbacks.delete uses DELETE method", async () => {
  const { fetch, calls } = recordingFetch([
    () =>
      new Response(
        JSON.stringify({ model: "gpt-4o", fallback_type: "general", message: "ok" }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
  ]);
  const client = baseClient(fetch);
  await client.fallbacks.delete("gpt-4o");
  assertEquals(calls[0]?.init?.method, "DELETE");
});
