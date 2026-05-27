/**
 * A single Server-Sent Event parsed from an event-stream response.
 *
 * `data` is the concatenation of all `data:` lines for the event, joined by
 * newlines. `event` and `id` are present only when the upstream sent them.
 */
export interface SSEEvent {
  readonly data: string;
  readonly event?: string;
  readonly id?: string;
}

/** Options accepted by `parseSSE`. */
export interface ParseSSEOptions {
  /**
   * When fired, cancels the underlying reader so the generator returns
   * promptly without dispatching any further events. Safe to pass an
   * already-aborted signal: the generator returns without reading.
   */
  readonly signal?: AbortSignal;
}

/**
 * Parse an `text/event-stream` byte stream into a sequence of `SSEEvent`s.
 *
 * Follows the WHATWG specification: lines split on CR, LF, or CRLF; fields are
 * `key:value` (with an optional leading space on the value); `data` lines are
 * concatenated with newlines; events dispatch on blank lines; lines starting
 * with `:` are comments. Stream-read errors propagate to the caller; this
 * parser does not wrap them in `Result`.
 *
 * Pass `options.signal` to cancel an in-flight stream from another context:
 * the reader is cancelled and the generator returns without yielding more
 * events.
 *
 * @see https://html.spec.whatwg.org/multipage/server-sent-events.html
 */
export const parseSSE = async function* (
  stream: ReadableStream<Uint8Array>,
  options?: ParseSSEOptions,
): AsyncIterable<SSEEvent> {
  const signal = options?.signal;
  const reader = stream.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let dataLines: string[] = [];
  let eventName: string | undefined = undefined;
  let lastId: string | undefined = undefined;

  const buildEvent = (): SSEEvent | null => {
    if (dataLines.length === 0) {
      eventName = undefined;
      return null;
    }
    const data = dataLines.join("\n");
    const ev: SSEEvent = {
      data,
      ...(eventName === undefined ? {} : { event: eventName }),
      ...(lastId === undefined ? {} : { id: lastId }),
    };
    dataLines = [];
    eventName = undefined;
    return ev;
  };

  const handleLine = (line: string): SSEEvent | null => {
    if (line === "") return buildEvent();
    if (line.startsWith(":")) return null;
    const colonIdx = line.indexOf(":");
    const field = colonIdx === -1 ? line : line.slice(0, colonIdx);
    let value = colonIdx === -1 ? "" : line.slice(colonIdx + 1);
    if (value.startsWith(" ")) value = value.slice(1);
    switch (field) {
      case "data":
        dataLines.push(value);
        break;
      case "event":
        eventName = value;
        break;
      case "id":
        lastId = value;
        break;
    }
    return null;
  };

  const onAbort = () => {
    reader.cancel().catch(() => {});
  };

  if (signal !== undefined) {
    if (signal.aborted) {
      await reader.cancel().catch(() => {});
      reader.releaseLock();
      return;
    }
    signal.addEventListener("abort", onAbort);
  }

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (signal?.aborted) return;
      if (done) {
        buffer += decoder.decode();
        if (buffer.length > 0) {
          const ev = handleLine(buffer);
          if (ev !== null) yield ev;
          buffer = "";
        }
        const trailing = buildEvent();
        if (trailing !== null) yield trailing;
        return;
      }
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split(/\r\n|\r|\n/);
      buffer = parts.pop() ?? "";
      for (const line of parts) {
        const ev = handleLine(line);
        if (ev !== null) yield ev;
      }
    }
  } finally {
    signal?.removeEventListener("abort", onAbort);
    reader.releaseLock();
  }
};
