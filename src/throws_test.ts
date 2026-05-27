import { assertEquals, assertRejects, assertStrictEquals } from "@std/assert";
import { createClient } from "./client.ts";
import { ApiErrorException } from "./error.ts";
import { isOk } from "./result.ts";

const json = (body: unknown, init: ResponseInit = {}): Response =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: { "content-type": "application/json", ...(init.headers as object | undefined) },
  });

Deno.test("client.throws.chat.create returns the unwrapped value on 2xx", async () => {
  const fetchFn: typeof fetch = () =>
    Promise.resolve(
      json({
        id: "chatcmpl-x",
        object: "chat.completion",
        created: 1,
        model: "gpt-4o",
        choices: [],
      }),
    );
  const client = createClient({
    baseUrl: "https://api.test",
    apiKey: "k",
    maxRetries: 0,
    fetch: fetchFn,
  });
  const r = await client.throws.chat.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: "hi" }],
  });
  assertStrictEquals(r.id, "chatcmpl-x");
});

Deno.test("client.throws.chat.create throws ApiErrorException with the typed error on failure", async () => {
  const fetchFn: typeof fetch = () =>
    Promise.resolve(
      new Response(JSON.stringify({ error: "denied" }), {
        status: 403,
        headers: { "content-type": "application/json" },
      }),
    );
  const client = createClient({
    baseUrl: "https://api.test",
    apiKey: "k",
    maxRetries: 0,
    fetch: fetchFn,
  });
  const err = await assertRejects(
    () =>
      client.throws.chat.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: "hi" }],
      }),
    ApiErrorException,
  );
  assertStrictEquals(err.error.kind, "auth");
});

Deno.test("client.throws preserves access to Result-returning sibling on client.chat", async () => {
  const fetchFn: typeof fetch = () => Promise.resolve(new Response("bad", { status: 400 }));
  const client = createClient({
    baseUrl: "https://api.test",
    apiKey: "k",
    maxRetries: 0,
    fetch: fetchFn,
  });
  const r = await client.chat.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: "hi" }],
  });
  assertStrictEquals(isOk(r), false);
});

Deno.test("client.throws.chat.createStream yields values directly and throws on stream error frames", async () => {
  const chunk = {
    id: "chatcmpl-x",
    object: "chat.completion.chunk",
    created: 1,
    model: "gpt-4o",
    choices: [{ index: 0, delta: { content: "hi" }, finish_reason: null }],
  };
  const errorFrame = { error: { message: "boom" } };
  const body = `data: ${JSON.stringify(chunk)}\n\ndata: ${JSON.stringify(errorFrame)}\n\n`;
  const fetchFn: typeof fetch = () =>
    Promise.resolve(
      new Response(body, {
        status: 200,
        headers: { "content-type": "text/event-stream" },
      }),
    );
  const client = createClient({
    baseUrl: "https://api.test",
    apiKey: "k",
    maxRetries: 0,
    fetch: fetchFn,
  });

  const collected: unknown[] = [];
  let caught: unknown = null;
  try {
    for await (
      const v of client.throws.chat.createStream({
        model: "gpt-4o",
        messages: [{ role: "user", content: "hi" }],
      })
    ) {
      collected.push(v);
    }
  } catch (e) {
    caught = e;
  }
  assertEquals(collected.length, 1);
  assertStrictEquals(caught instanceof ApiErrorException, true);
});
