import { type AudioNamespace, createAudio } from "./api/audio.ts";
import { type ChatNamespace, createChat } from "./api/chat.ts";
import { createEmbeddings, type EmbeddingsNamespace } from "./api/embeddings.ts";
import { createImages, type ImagesNamespace } from "./api/images.ts";
import { createMessages, type MessagesNamespace } from "./api/messages.ts";
import { createModeration, type ModerationNamespace } from "./api/moderation.ts";
import { createRerank, type RerankNamespace } from "./api/rerank.ts";
import { createTransport, type TransportConfig } from "./transport.ts";

/** The top-level SDK surface. Construct via `createClient`. */
export interface Client {
  /** Chat completion endpoints (OpenAI shape). */
  readonly chat: ChatNamespace;
  /** Anthropic-shape `/v1/messages` endpoint. */
  readonly messages: MessagesNamespace;
  /** Embeddings endpoint. */
  readonly embeddings: EmbeddingsNamespace;
  /** Image generation endpoint. */
  readonly images: ImagesNamespace;
  /** Audio transcription and speech endpoints. */
  readonly audio: AudioNamespace;
  /** Rerank endpoint. */
  readonly rerank: RerankNamespace;
  /** Content moderation endpoint. */
  readonly moderation: ModerationNamespace;
}

/** Build a `Client` bound to the given transport configuration. */
export const createClient = (config: TransportConfig): Client => {
  const transport = createTransport(config);
  return {
    chat: createChat(transport),
    messages: createMessages(transport),
    embeddings: createEmbeddings(transport),
    images: createImages(transport),
    audio: createAudio(transport),
    rerank: createRerank(transport),
    moderation: createModeration(transport),
  };
};
