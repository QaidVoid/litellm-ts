import { assertEquals, assertExists } from "@std/assert";
import { parseSSE, type SSEEvent } from "./sse.ts";

const streamFromString = (text: string): ReadableStream<Uint8Array> => {
  const body = new Response(text).body;
  assertExists(body);
  return body;
};

const streamFromChunks = (chunks: readonly string[]): ReadableStream<Uint8Array> => {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const c of chunks) controller.enqueue(encoder.encode(c));
      controller.close();
    },
  });
};

const collect = async (stream: ReadableStream<Uint8Array>): Promise<SSEEvent[]> => {
  const events: SSEEvent[] = [];
  for await (const ev of parseSSE(stream)) events.push(ev);
  return events;
};

Deno.test("parses a single data event", async () => {
  const events = await collect(streamFromString("data: hello\n\n"));
  assertEquals(events, [{ data: "hello" }]);
});

Deno.test("multi-line data is joined with newlines", async () => {
  const events = await collect(
    streamFromString("data: line1\ndata: line2\ndata: line3\n\n"),
  );
  assertEquals(events, [{ data: "line1\nline2\nline3" }]);
});

Deno.test("multiple events separated by blank lines", async () => {
  const events = await collect(
    streamFromString("data: a\n\ndata: b\n\ndata: c\n\n"),
  );
  assertEquals(events, [{ data: "a" }, { data: "b" }, { data: "c" }]);
});

Deno.test("comments and unknown fields are ignored", async () => {
  const events = await collect(
    streamFromString(": this is a comment\nfoo: bar\ndata: real\n\n"),
  );
  assertEquals(events, [{ data: "real" }]);
});

Deno.test("event and id fields populate the resulting record", async () => {
  const events = await collect(
    streamFromString("event: ping\nid: 42\ndata: payload\n\n"),
  );
  assertEquals(events, [{ data: "payload", event: "ping", id: "42" }]);
});

Deno.test("id persists across events until cleared", async () => {
  const events = await collect(
    streamFromString("id: 1\ndata: first\n\ndata: second\n\n"),
  );
  assertEquals(events, [
    { data: "first", id: "1" },
    { data: "second", id: "1" },
  ]);
});

Deno.test("events without data do not dispatch", async () => {
  const events = await collect(streamFromString("event: ping\n\ndata: real\n\n"));
  assertEquals(events, [{ data: "real" }]);
});

Deno.test("CRLF line endings work the same as LF", async () => {
  const events = await collect(
    streamFromString("data: one\r\ndata: two\r\n\r\n"),
  );
  assertEquals(events, [{ data: "one\ntwo" }]);
});

Deno.test("value leading space is stripped only once", async () => {
  const events = await collect(streamFromString("data:  spaced\n\n"));
  assertEquals(events, [{ data: " spaced" }]);
});

Deno.test("chunk boundaries inside a line are reassembled", async () => {
  const events = await collect(
    streamFromChunks(["data: hel", "lo\n\ndata: w", "orld\n\n"]),
  );
  assertEquals(events, [{ data: "hello" }, { data: "world" }]);
});

Deno.test("trailing event without final blank line still dispatches at stream end", async () => {
  const events = await collect(streamFromString("data: tail\n"));
  assertEquals(events, [{ data: "tail" }]);
});

Deno.test("the [DONE] sentinel surfaces as a normal data event", async () => {
  const events = await collect(
    streamFromString('data: {"x":1}\n\ndata: [DONE]\n\n'),
  );
  assertEquals(events, [{ data: '{"x":1}' }, { data: "[DONE]" }]);
});
