import { assertEquals, assertStrictEquals } from "@std/assert";
import { createClient } from "../../client.ts";
import type { User } from "./users.ts";

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

const sampleUser: User = {
  user_id: "u-1",
  user_email: "alice@example.test",
  user_role: "internal_user",
};

Deno.test("users.create POSTs to /user/new with the user body", async () => {
  const { fetch, calls } = recordingFetch([
    () =>
      new Response(JSON.stringify(sampleUser), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  ]);
  const client = baseClient(fetch);
  await client.users.create({ user_email: "alice@example.test", user_role: "internal_user" });
  assertStrictEquals(calls[0]?.input, "https://api.test/user/new");
  const body = JSON.parse(calls[0]?.init?.body as string);
  assertStrictEquals(body.user_email, "alice@example.test");
});

Deno.test("users.info passes the query keys present and omits undefined", async () => {
  const { fetch, calls } = recordingFetch([
    () =>
      new Response(JSON.stringify(sampleUser), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  ]);
  const client = baseClient(fetch);
  await client.users.info({ user_email: "alice@example.test" });
  const url = new URL(calls[0]?.input as string);
  assertStrictEquals(url.searchParams.get("user_email"), "alice@example.test");
  assertStrictEquals(url.searchParams.has("user_id"), false);
});

Deno.test("users.delete posts the user_ids to /user/delete", async () => {
  const { fetch, calls } = recordingFetch([
    () =>
      new Response(JSON.stringify({ status: "success" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  ]);
  const client = baseClient(fetch);
  await client.users.delete({ user_ids: ["u-1", "u-2"] });
  const body = JSON.parse(calls[0]?.init?.body as string);
  assertEquals(body, { user_ids: ["u-1", "u-2"] });
});
