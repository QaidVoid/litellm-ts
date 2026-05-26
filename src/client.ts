import { createHealth, type HealthNamespace } from "./api/admin/health.ts";
import { createKeys, type KeysNamespace } from "./api/admin/keys.ts";
import { createProxyModels, type ProxyModelsNamespace } from "./api/admin/models.ts";
import { createTeams, type TeamsNamespace } from "./api/admin/teams.ts";
import { type BudgetsNamespace, createBudgets } from "./api/admin/budgets.ts";
import { createSpend, type SpendNamespace } from "./api/admin/spend.ts";
import { createUsers, type UsersNamespace } from "./api/admin/users.ts";
import { type AudioNamespace, createAudio } from "./api/audio.ts";
import { type ChatNamespace, createChat } from "./api/chat.ts";
import { createEmbeddings, type EmbeddingsNamespace } from "./api/embeddings.ts";
import { createFiles, type FilesNamespace } from "./api/files.ts";
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
  /** Files endpoint (upload, list, retrieve, delete, content). */
  readonly files: FilesNamespace;
  /** Proxy health probes (liveliness, readiness, test_connection). */
  readonly health: HealthNamespace;
  /** Virtual key administration. */
  readonly keys: KeysNamespace;
  /**
   * Proxy-side model administration (register, list, update, delete).
   *
   * Distinct from the static `MODELS` registry: this namespace operates on
   * the live set of models the running proxy knows about, while `MODELS` is
   * a build-time literal of every model declared in LiteLLM's upstream
   * pricing table.
   */
  readonly proxyModels: ProxyModelsNamespace;
  /** Team administration. */
  readonly teams: TeamsNamespace;
  /** Internal user administration. */
  readonly users: UsersNamespace;
  /** Spend analytics endpoints (calculate, tags, logs). */
  readonly spend: SpendNamespace;
  /** Budget administration. */
  readonly budgets: BudgetsNamespace;
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
    files: createFiles(transport),
    health: createHealth(transport),
    keys: createKeys(transport),
    proxyModels: createProxyModels(transport),
    teams: createTeams(transport),
    users: createUsers(transport),
    spend: createSpend(transport),
    budgets: createBudgets(transport),
  };
};
