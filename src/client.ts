import { createHealth, type HealthNamespace } from "./api/admin/health.ts";
import { createKeys, type KeysNamespace } from "./api/admin/keys.ts";
import { createOrganizations, type OrganizationsNamespace } from "./api/admin/organizations.ts";
import { createProxyModels, type ProxyModelsNamespace } from "./api/admin/models.ts";
import { createTeams, type TeamsNamespace } from "./api/admin/teams.ts";
import { type BudgetsNamespace, createBudgets } from "./api/admin/budgets.ts";
import { type CacheNamespace, createCache } from "./api/admin/cache.ts";
import { type CallbacksNamespace, createCallbacks } from "./api/admin/callbacks.ts";
import { type ConfigNamespace, createConfig } from "./api/admin/config.ts";
import { type AccessGroupsNamespace, createAccessGroups } from "./api/admin/access_groups.ts";
import { type ComplianceNamespace, createCompliance } from "./api/admin/compliance.ts";
import { createCustomers, type CustomersNamespace } from "./api/admin/customers.ts";
import { createFallbacks, type FallbacksNamespace } from "./api/admin/fallbacks.ts";
import { createJwtMappings, type JwtMappingsNamespace } from "./api/admin/jwt_mappings.ts";
import { createMcp, type McpNamespace } from "./api/admin/mcp.ts";
import { createPrompts, type PromptsNamespace } from "./api/admin/prompts.ts";
import { createScim, type ScimNamespace } from "./api/admin/scim.ts";
import { createCredentials, type CredentialsNamespace } from "./api/admin/credentials.ts";
import { type ContainersNamespace, createContainers } from "./api/containers.ts";
import { createEvals, type EvalsNamespace } from "./api/evals.ts";
import { type AgentsNamespace, createAgents } from "./api/agents.ts";
import {
  type AssistantsNamespace,
  createAssistants,
  createThreads,
  type ThreadsNamespace,
} from "./api/assistants.ts";
import { type AnthropicSkillsNamespace, createAnthropicSkills } from "./api/anthropic_skills.ts";
import { type ClaudeCodeNamespace, createClaudeCode } from "./api/claude_code.ts";
import { createGoogleGenai, type GoogleGenaiNamespace } from "./api/google_genai.ts";
import { createOcr, type OcrNamespace } from "./api/ocr.ts";
import { createRag, type RagNamespace } from "./api/rag.ts";
import { createSearch, type SearchNamespace } from "./api/search.ts";
import { createRouter, type RouterNamespace } from "./api/admin/router.ts";
import { createTags, type TagsNamespace } from "./api/admin/tags.ts";
import { createTools, type ToolsNamespace } from "./api/admin/tools.ts";
import { createGuardrails, type GuardrailsNamespace } from "./api/admin/guardrails.ts";
import { createSpend, type SpendNamespace } from "./api/admin/spend.ts";
import { createUsers, type UsersNamespace } from "./api/admin/users.ts";
import { type AudioNamespace, createAudio } from "./api/audio.ts";
import { type BatchesNamespace, createBatches } from "./api/batches.ts";
import { createFineTuning, type FineTuningNamespace } from "./api/fine_tuning.ts";
import { type ChatNamespace, createChat } from "./api/chat.ts";
import { type CompletionsNamespace, createCompletions } from "./api/completions.ts";
import { createEmbeddings, type EmbeddingsNamespace } from "./api/embeddings.ts";
import { createFiles, type FilesNamespace } from "./api/files.ts";
import { createImages, type ImagesNamespace } from "./api/images.ts";
import { createMessages, type MessagesNamespace } from "./api/messages.ts";
import { createModeration, type ModerationNamespace } from "./api/moderation.ts";
import { createPassthrough, type PassthroughNamespace } from "./api/passthrough.ts";
import { createRealtime, type RealtimeNamespace } from "./api/realtime.ts";
import { createRerank, type RerankNamespace } from "./api/rerank.ts";
import { createResponses, type ResponsesNamespace } from "./api/responses.ts";
import { createVectorStores, type VectorStoresNamespace } from "./api/vector_stores.ts";
import { createVideos, type VideosNamespace } from "./api/videos.ts";
import { createTransport, type TransportConfig } from "./transport.ts";

/** The top-level SDK surface. Construct via `createClient`. */
export interface Client {
  /** Chat completion endpoints (OpenAI shape). */
  readonly chat: ChatNamespace;
  /** Anthropic-shape `/v1/messages` endpoint. */
  readonly messages: MessagesNamespace;
  /** Legacy `/v1/completions` text endpoint. */
  readonly completions: CompletionsNamespace;
  /** OpenAI Responses API (`/v1/responses`). */
  readonly responses: ResponsesNamespace;
  /** Vector stores endpoint (CRUD + file attachments). */
  readonly vectorStores: VectorStoresNamespace;
  /** Realtime WebSocket API. */
  readonly realtime: RealtimeNamespace;
  /** Embeddings endpoint. */
  readonly embeddings: EmbeddingsNamespace;
  /** Image generation endpoint. */
  readonly images: ImagesNamespace;
  /** Audio transcription and speech endpoints. */
  readonly audio: AudioNamespace;
  /** Video generation endpoints (mode-gated). */
  readonly videos: VideosNamespace;
  /** OCR endpoint (mode-gated). */
  readonly ocr: OcrNamespace;
  /** RAG ingest + query pipeline. */
  readonly rag: RagNamespace;
  /** OpenAI Containers API (code execution sandboxes). */
  readonly containers: ContainersNamespace;
  /** OpenAI Evals API (evaluations + runs). */
  readonly evals: EvalsNamespace;
  /** A2A agents API (CRUD + agent cards + JSON-RPC messaging). */
  readonly agents: AgentsNamespace;
  /** OpenAI Assistants API (assistant CRUD). */
  readonly assistants: AssistantsNamespace;
  /** OpenAI Threads API (threads + messages + runs). */
  readonly threads: ThreadsNamespace;
  /** Search API (per-provider web search + tool management). */
  readonly search: SearchNamespace;
  /** Native Google GenAI shape (`:generateContent`, `:countTokens`, agents, interactions). */
  readonly googleGenai: GoogleGenaiNamespace;
  /** Anthropic Skills API (beta). */
  readonly anthropicSkills: AnthropicSkillsNamespace;
  /** Claude Code plugin marketplace administration. */
  readonly claudeCode: ClaudeCodeNamespace;
  /** Rerank endpoint. */
  readonly rerank: RerankNamespace;
  /** Content moderation endpoint. */
  readonly moderation: ModerationNamespace;
  /** Files endpoint (upload, list, retrieve, delete, content). */
  readonly files: FilesNamespace;
  /** Batches endpoint (submit and track bulk jobs). */
  readonly batches: BatchesNamespace;
  /** Fine-tuning job endpoints. */
  readonly fineTuning: FineTuningNamespace;
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
  /** Organization administration. */
  readonly organizations: OrganizationsNamespace;
  /** Customer (end-user) administration. */
  readonly customers: CustomersNamespace;
  /** Tag administration (routing + spend tracking). */
  readonly tags: TagsNamespace;
  /** Fallback configuration per model. */
  readonly fallbacks: FallbacksNamespace;
  /** Router setting reads (live values and field metadata). */
  readonly router: RouterNamespace;
  /** Access groups (unified ACL across models, MCP servers, agents). */
  readonly accessGroups: AccessGroupsNamespace;
  /** JWT-claim-to-virtual-key mappings. */
  readonly jwtMappings: JwtMappingsNamespace;
  /** Regulatory compliance checks (EU AI Act, GDPR). */
  readonly compliance: ComplianceNamespace;
  /** Tool registry and per-tool policy administration. */
  readonly tools: ToolsNamespace;
  /** Prompt registry administration. */
  readonly prompts: PromptsNamespace;
  /** MCP server and toolset administration. */
  readonly mcp: McpNamespace;
  /** SCIM v2 identity-provider integration (enterprise only). */
  readonly scim: ScimNamespace;
  /** Stored credential administration. */
  readonly credentials: CredentialsNamespace;
  /** Logging callback configuration. */
  readonly callbacks: CallbacksNamespace;
  /** Configured guardrails listing. */
  readonly guardrails: GuardrailsNamespace;
  /** Proxy cache backend administration. */
  readonly cache: CacheNamespace;
  /** Proxy configuration get/update. */
  readonly config: ConfigNamespace;
  /** Native-shape passthrough to Anthropic via the LiteLLM proxy. */
  readonly anthropic: PassthroughNamespace;
  /** Native-shape passthrough to OpenAI. */
  readonly openai: PassthroughNamespace;
  /** Native-shape passthrough to Google Gemini. */
  readonly gemini: PassthroughNamespace;
  /** Native-shape passthrough to Google Vertex AI. */
  readonly vertexAi: PassthroughNamespace;
  /** Native-shape passthrough to Cohere. */
  readonly cohere: PassthroughNamespace;
  /** Native-shape passthrough to Mistral. */
  readonly mistral: PassthroughNamespace;
  /** Native-shape passthrough to AssemblyAI. */
  readonly assemblyai: PassthroughNamespace;
  /** Native-shape passthrough to Azure OpenAI. */
  readonly azure: PassthroughNamespace;
  /** Native-shape passthrough to AWS Bedrock. */
  readonly bedrock: PassthroughNamespace;
}

/** Build a `Client` bound to the given transport configuration. */
export const createClient = (config: TransportConfig): Client => {
  const transport = createTransport(config);
  return {
    chat: createChat(transport),
    messages: createMessages(transport),
    completions: createCompletions(transport),
    responses: createResponses(transport),
    vectorStores: createVectorStores(transport),
    realtime: createRealtime(config),
    embeddings: createEmbeddings(transport),
    images: createImages(transport),
    audio: createAudio(transport),
    videos: createVideos(transport),
    ocr: createOcr(transport),
    rag: createRag(transport),
    containers: createContainers(transport),
    evals: createEvals(transport),
    agents: createAgents(transport),
    assistants: createAssistants(transport),
    threads: createThreads(transport),
    search: createSearch(transport),
    googleGenai: createGoogleGenai(transport),
    anthropicSkills: createAnthropicSkills(transport),
    claudeCode: createClaudeCode(transport),
    rerank: createRerank(transport),
    moderation: createModeration(transport),
    files: createFiles(transport),
    batches: createBatches(transport),
    fineTuning: createFineTuning(transport),
    health: createHealth(transport),
    keys: createKeys(transport),
    proxyModels: createProxyModels(transport),
    teams: createTeams(transport),
    users: createUsers(transport),
    spend: createSpend(transport),
    budgets: createBudgets(transport),
    organizations: createOrganizations(transport),
    customers: createCustomers(transport),
    tags: createTags(transport),
    fallbacks: createFallbacks(transport),
    router: createRouter(transport),
    accessGroups: createAccessGroups(transport),
    jwtMappings: createJwtMappings(transport),
    compliance: createCompliance(transport),
    tools: createTools(transport),
    prompts: createPrompts(transport),
    mcp: createMcp(transport),
    scim: createScim(transport),
    credentials: createCredentials(transport),
    callbacks: createCallbacks(transport),
    guardrails: createGuardrails(transport),
    cache: createCache(transport),
    config: createConfig(transport),
    anthropic: createPassthrough(transport, "/anthropic"),
    openai: createPassthrough(transport, "/openai"),
    gemini: createPassthrough(transport, "/gemini"),
    vertexAi: createPassthrough(transport, "/vertex-ai"),
    cohere: createPassthrough(transport, "/cohere"),
    mistral: createPassthrough(transport, "/mistral"),
    assemblyai: createPassthrough(transport, "/assemblyai"),
    azure: createPassthrough(transport, "/azure"),
    bedrock: createPassthrough(transport, "/bedrock"),
  };
};
