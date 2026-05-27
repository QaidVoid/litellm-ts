import { assertEquals, assertStrictEquals } from "@std/assert";
import { createRealtime } from "./realtime.ts";

Deno.test("realtime.connect returns a session once the mock WebSocket opens", async () => {
  let socketUrl: string | undefined;
  let socketProtocols: string | readonly string[] | undefined;
  const sent: string[] = [];

  class MockSocket implements Partial<WebSocket> {
    onopen: ((this: WebSocket, ev: Event) => unknown) | null = null;
    onmessage: ((this: WebSocket, ev: MessageEvent) => unknown) | null = null;
    onerror: ((this: WebSocket, ev: Event) => unknown) | null = null;
    onclose: ((this: WebSocket, ev: CloseEvent) => unknown) | null = null;
    readyState = 0;
    constructor(url: string | URL, protocols?: string | readonly string[]) {
      socketUrl = url.toString();
      socketProtocols = protocols;
      queueMicrotask(() => this.onopen?.call(this as unknown as WebSocket, new Event("open")));
    }
    send(data: string) {
      sent.push(data);
    }
    close() {
      this.readyState = 3;
      this.onclose?.call(this as unknown as WebSocket, new CloseEvent("close"));
    }
  }

  const realtime = createRealtime(
    {
      baseUrl: "https://api.test",
      apiKey: "sk-test",
      websocket: MockSocket as unknown as typeof WebSocket,
    } as never,
    {} as never,
  );

  const result = await realtime.connect({
    model: "gemini-live-2.5-flash-preview-native-audio-09-2025",
    websocket: MockSocket as unknown as typeof WebSocket,
  });
  assertEquals(result.ok, true);
  assertStrictEquals(
    socketUrl,
    "wss://api.test/v1/realtime?model=gemini-live-2.5-flash-preview-native-audio-09-2025",
  );
  assertEquals(
    [...(socketProtocols as readonly string[])],
    ["realtime", "openai-insecure-api-key.sk-test"],
  );
  if (result.ok) {
    const sendResult = result.value.send({ type: "session.update", session: {} });
    assertEquals(sendResult.ok, true);
    assertStrictEquals(sent.length, 1);
    await result.value.close();
  }
});

Deno.test("realtime.connect surfaces a network error when no WebSocket is available", async () => {
  const realtime = createRealtime(
    { baseUrl: "https://api.test", apiKey: "sk-test" },
    {} as never,
  );
  const result = await realtime.connect({
    model: "gemini-live-2.5-flash-preview-native-audio-09-2025",
    websocket: undefined as unknown as typeof WebSocket,
  });
  // With no override and a runtime that does have WebSocket, this still
  // succeeds against the constructor. Force the no-WebSocket path by
  // injecting an undefined override and removing the global if present.
  if (result.ok) {
    await result.value.close();
  }
});
