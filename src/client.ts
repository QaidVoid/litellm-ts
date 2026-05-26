import { type ChatNamespace, createChat } from "./api/chat.ts";
import { createTransport, type TransportConfig } from "./transport.ts";

/** The top-level SDK surface. Construct via `createClient`. */
export interface Client {
  /** Chat completion endpoints. */
  readonly chat: ChatNamespace;
}

/** Build a `Client` bound to the given transport configuration. */
export const createClient = (config: TransportConfig): Client => {
  const transport = createTransport(config);
  return {
    chat: createChat(transport),
  };
};
