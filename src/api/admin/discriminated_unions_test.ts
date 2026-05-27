import type {
  CalculateSpendRequest,
  CreateCustomerRequest,
  CreateMcpServerRequest,
  CredentialValuesSource,
  KeyTempBudgetBump,
  RagIngestSource,
  UpdateToolPolicyScope,
} from "../../../mod.ts";
import type { PluginSource } from "../claude_code.ts";

// Each declaration below is a positive or negative type-level assertion. The
// file compiles only if the discriminated unions actually enforce the rule.

// MCP: stdio transport requires command + args.
const _mcpStdio: CreateMcpServerRequest = {
  transport: "stdio",
  command: "npx",
  args: ["-y", "@modelcontextprotocol/server-everything"],
  auth_type: "none",
};

// @ts-expect-error stdio without command is rejected.
const _mcpStdioMissingCommand: CreateMcpServerRequest = {
  transport: "stdio",
  args: [],
};

// http transport with url and oauth2 metadata accepted.
const _mcpHttpOauth: CreateMcpServerRequest = {
  transport: "http",
  url: "https://example.com/mcp",
  auth_type: "oauth2",
  authorization_url: "https://example.com/oauth/authorize",
  token_url: "https://example.com/oauth/token",
};

const _mcpApiKeyWithOauthField: CreateMcpServerRequest = {
  transport: "http",
  url: "https://example.com/mcp",
  auth_type: "api_key",
  // @ts-expect-error oauth2 helper fields rejected when auth_type is api_key.
  authorization_url: "https://example.com/x",
};

// Plugin source: github variant accepts repo.
const _pluginGithub: PluginSource = { source: "github", repo: "org/repo" };

// @ts-expect-error github variant rejects `url`.
const _pluginGithubWrong: PluginSource = { source: "github", url: "x" };

// Plugin source: git-subdir requires both url and path.
const _pluginSubdir: PluginSource = {
  source: "git-subdir",
  url: "https://example.com/r.git",
  path: "plugins/x",
};

// @ts-expect-error git-subdir missing path is rejected.
const _pluginSubdirMissingPath: PluginSource = {
  source: "git-subdir",
  url: "https://example.com/r.git",
};

// Customer budget: existing budget_id rules out max_budget.
const _custExisting: CreateCustomerRequest = {
  user_id: "u",
  budget_id: "b-1",
};

// @ts-expect-error max_budget forbidden when budget_id is set.
const _custBoth: CreateCustomerRequest = {
  user_id: "u",
  budget_id: "b-1",
  max_budget: 5,
};

// Customer inline budget allows max_budget + budget_duration.
const _custInline: CreateCustomerRequest = {
  user_id: "u",
  max_budget: 100,
  budget_duration: "30d",
};

// Credentials: model_id XOR credential_values.
const _credByModel: CredentialValuesSource = { model_id: "m" };
const _credByValues: CredentialValuesSource = { credential_values: { api_key: "k" } };

// @ts-expect-error setting both sources is rejected.
const _credBoth: CredentialValuesSource = {
  model_id: "m",
  credential_values: {},
};

// Spend: messages XOR completion_response.
const _spendByMessages: CalculateSpendRequest = {
  model: "gpt-4o",
  messages: [{ role: "user", content: "hi" }],
};
const _spendByResponse: CalculateSpendRequest = {
  model: "gpt-4o",
  completion_response: { usage: { prompt_tokens: 1, completion_tokens: 1 } },
};

// @ts-expect-error empty calc request (no source) is rejected.
const _spendNeither: CalculateSpendRequest = { model: "gpt-4o" };

// Tool policy scope: team_id and key_hash are mutually exclusive.
const _scopeTeam: UpdateToolPolicyScope = { team_id: "t" };
const _scopeKey: UpdateToolPolicyScope = { key_hash: "h" };
const _scopeGlobal: UpdateToolPolicyScope = {};

// @ts-expect-error both team_id and key_hash is rejected.
const _scopeBoth: UpdateToolPolicyScope = { team_id: "t", key_hash: "h" };

// RAG ingest source: exactly one of file_url, file_id, file.
const _ragByUrl: RagIngestSource = { file_url: "https://example.com/x.pdf" };
const _ragById: RagIngestSource = { file_id: "f-1" };

// @ts-expect-error two sources rejected.
const _ragTwo: RagIngestSource = { file_url: "https://x", file_id: "f-1" };

// Key temp budget pair must move together.
const _tempBoth: KeyTempBudgetBump = {
  temp_budget_increase: 50,
  temp_budget_expiry: "2026-12-31T00:00:00Z",
};
const _tempNone: KeyTempBudgetBump = {};

// @ts-expect-error only one half of the pair is rejected.
const _tempHalf: KeyTempBudgetBump = { temp_budget_increase: 50 };

// Suppress unused warnings.
void _mcpStdio;
void _mcpStdioMissingCommand;
void _mcpHttpOauth;
void _mcpApiKeyWithOauthField;
void _pluginGithub;
void _pluginGithubWrong;
void _pluginSubdir;
void _pluginSubdirMissingPath;
void _custExisting;
void _custBoth;
void _custInline;
void _credByModel;
void _credByValues;
void _credBoth;
void _spendByMessages;
void _spendByResponse;
void _spendNeither;
void _scopeTeam;
void _scopeKey;
void _scopeGlobal;
void _scopeBoth;
void _ragByUrl;
void _ragById;
void _ragTwo;
void _tempBoth;
void _tempNone;
void _tempHalf;

Deno.test("discriminated-union types compile as expected", () => {});
