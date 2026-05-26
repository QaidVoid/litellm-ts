import { assertEquals, assertStrictEquals } from "@std/assert";
import { createClient } from "../../client.ts";
import type { ProxyModel } from "./models.ts";

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

const sampleModel: ProxyModel = {
  model_id: "m-1",
  model_name: "gpt-4o",
  litellm_params: { model: "openai/gpt-4o" },
};

Deno.test("proxyModels.register posts the model definition to /model/new", async () => {
  const { fetch, calls } = recordingFetch([
    () =>
      new Response(JSON.stringify(sampleModel), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  ]);
  const client = baseClient(fetch);
  await client.proxyModels.register({
    model_name: "gpt-4o",
    litellm_params: { model: "openai/gpt-4o", api_key: "os.environ/OPENAI_API_KEY" },
  });
  assertStrictEquals(calls[0]?.input, "https://api.test/model/new");
  const body = JSON.parse(calls[0]?.init?.body as string);
  assertStrictEquals(body.model_name, "gpt-4o");
  assertStrictEquals(body.litellm_params.model, "openai/gpt-4o");
});

Deno.test("proxyModels.retrieve passes model_id as a query parameter", async () => {
  const { fetch, calls } = recordingFetch([
    () =>
      new Response(JSON.stringify(sampleModel), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  ]);
  const client = baseClient(fetch);
  await client.proxyModels.retrieve("m-1");
  const url = new URL(calls[0]?.input as string);
  assertStrictEquals(url.pathname, "/model/info");
  assertStrictEquals(url.searchParams.get("model_id"), "m-1");
});

Deno.test("proxyModels.update PATCHes /model/{id}/update", async () => {
  const { fetch, calls } = recordingFetch([
    () =>
      new Response(JSON.stringify(sampleModel), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  ]);
  const client = baseClient(fetch);
  await client.proxyModels.update("m-1", { litellm_params: { model: "openai/gpt-4o-mini" } });
  assertStrictEquals(calls[0]?.init?.method, "PATCH");
  assertStrictEquals(calls[0]?.input, "https://api.test/model/m-1/update");
});

Deno.test("proxyModels.delete posts the id to /model/delete", async () => {
  const { fetch, calls } = recordingFetch([
    () =>
      new Response(JSON.stringify({ status: "success" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  ]);
  const client = baseClient(fetch);
  await client.proxyModels.delete("m-1");
  const body = JSON.parse(calls[0]?.init?.body as string);
  assertEquals(body, { id: "m-1" });
});
