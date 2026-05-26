import { assertStrictEquals } from "@std/assert";
import { createClient } from "../client.ts";

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

Deno.test("anthropic passthrough prefixes the path with /anthropic", async () => {
  const { fetch, calls } = recordingFetch([
    () =>
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  ]);
  const client = baseClient(fetch);
  await client.anthropic.request({
    method: "POST",
    path: "/v1/messages",
    body: { model: "claude-sonnet-4-5", messages: [], max_tokens: 8 },
  });
  assertStrictEquals(calls[0]?.input, "https://api.test/anthropic/v1/messages");
});

Deno.test("openai passthrough strips a leading slash when joining the path", async () => {
  const { fetch, calls } = recordingFetch([
    () =>
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  ]);
  const client = baseClient(fetch);
  await client.openai.request({ method: "GET", path: "v1/models" });
  assertStrictEquals(calls[0]?.input, "https://api.test/openai/v1/models");
});

Deno.test("vertexAi passthrough resolves the /vertex-ai prefix", async () => {
  const { fetch, calls } = recordingFetch([
    () =>
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  ]);
  const client = baseClient(fetch);
  await client.vertexAi.request({ method: "GET", path: "/v1/projects" });
  assertStrictEquals(calls[0]?.input, "https://api.test/vertex-ai/v1/projects");
});
