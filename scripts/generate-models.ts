/**
 * Generate `src/models/registry.ts` from LiteLLM's upstream
 * `model_prices_and_context_window.json`.
 *
 * Reads the source from either:
 *   - `$LITELLM_REPO/model_prices_and_context_window.json` when the env var
 *     is set (offline / pinned use), or
 *   - the GitHub raw URL otherwise.
 *
 * Run with: `deno task gen:models`.
 */

const SOURCE_URL =
  "https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json";

const OUTPUT_PATH = new URL("../src/models/registry.ts", import.meta.url);

type RawModel = {
  readonly litellm_provider?: string;
  readonly mode?: string;
  readonly max_input_tokens?: number;
  readonly max_output_tokens?: number;
  readonly input_cost_per_token?: number;
  readonly output_cost_per_token?: number;
} & Record<string, unknown>;

const SKIP_KEYS = new Set(["sample_spec", "*"]);
const SUPPORTS_PREFIX = "supports_";

const loadSource = async (): Promise<Record<string, RawModel>> => {
  const local = Deno.env.get("LITELLM_REPO");
  if (local !== undefined && local.length > 0) {
    const text = await Deno.readTextFile(
      `${local}/model_prices_and_context_window.json`,
    );
    return JSON.parse(text);
  }
  const res = await fetch(SOURCE_URL);
  if (!res.ok) {
    throw new Error(`failed to fetch upstream: ${res.status} ${res.statusText}`);
  }
  return await res.json();
};

const extractCapabilities = (model: RawModel): readonly string[] => {
  const caps: string[] = [];
  for (const key of Object.keys(model)) {
    if (key.startsWith(SUPPORTS_PREFIX) && model[key] === true) {
      caps.push(key.slice(SUPPORTS_PREFIX.length));
    }
  }
  caps.sort();
  return caps;
};

const quote = (s: string): string => `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

const isCleanMode = (mode: unknown): mode is string =>
  typeof mode === "string" && !mode.startsWith("one of");

const isNonEmptyString = (v: unknown): v is string => typeof v === "string" && v.length > 0;

const isFiniteNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

type Entry = {
  readonly id: string;
  readonly provider: string;
  readonly mode: string | null;
  readonly maxInputTokens: number | null;
  readonly maxOutputTokens: number | null;
  readonly inputCostPerToken: number | null;
  readonly outputCostPerToken: number | null;
  readonly capabilities: readonly string[];
};

const buildEntry = (id: string, raw: RawModel): Entry | null => {
  if (!isNonEmptyString(raw.litellm_provider)) return null;
  return {
    id,
    provider: raw.litellm_provider,
    mode: isCleanMode(raw.mode) ? raw.mode : null,
    maxInputTokens: isFiniteNumber(raw.max_input_tokens) ? raw.max_input_tokens : null,
    maxOutputTokens: isFiniteNumber(raw.max_output_tokens) ? raw.max_output_tokens : null,
    inputCostPerToken: isFiniteNumber(raw.input_cost_per_token) ? raw.input_cost_per_token : null,
    outputCostPerToken: isFiniteNumber(raw.output_cost_per_token)
      ? raw.output_cost_per_token
      : null,
    capabilities: extractCapabilities(raw),
  };
};

const renderUnion = (name: string, members: readonly string[]): string => {
  if (members.length === 0) return `export type ${name} = never;\n`;
  return `export type ${name} =\n${members.map((m) => `  | ${quote(m)}`).join("\n")};\n`;
};

const renderModels = (entries: readonly Entry[]): string => {
  const lines: string[] = ["export const MODELS: Record<ModelId, ModelEntry> = {"];
  for (const e of entries) {
    lines.push(`  ${quote(e.id)}: {`);
    lines.push(`    id: ${quote(e.id)},`);
    lines.push(`    provider: ${quote(e.provider)},`);
    lines.push(`    mode: ${e.mode === null ? "null" : quote(e.mode)},`);
    lines.push(`    maxInputTokens: ${e.maxInputTokens === null ? "null" : e.maxInputTokens},`);
    lines.push(`    maxOutputTokens: ${e.maxOutputTokens === null ? "null" : e.maxOutputTokens},`);
    lines.push(
      `    inputCostPerToken: ${e.inputCostPerToken === null ? "null" : e.inputCostPerToken},`,
    );
    lines.push(
      `    outputCostPerToken: ${e.outputCostPerToken === null ? "null" : e.outputCostPerToken},`,
    );
    lines.push(
      `    capabilities: [${e.capabilities.map(quote).join(", ")}],`,
    );
    lines.push(`  },`);
  }
  lines.push("};");
  return lines.join("\n") + "\n";
};

const renderModelsByCapability = (
  entries: readonly Entry[],
  capabilities: readonly string[],
): string => {
  const byCap = new Map<string, string[]>();
  for (const cap of capabilities) byCap.set(cap, []);
  for (const e of entries) {
    for (const cap of e.capabilities) {
      byCap.get(cap)?.push(e.id);
    }
  }
  const lines: string[] = ["export interface ModelsByCapability {"];
  for (const cap of capabilities) {
    const models = byCap.get(cap) ?? [];
    if (models.length === 0) {
      lines.push(`  ${quote(cap)}: never;`);
    } else {
      lines.push(`  ${quote(cap)}:`);
      const unionLines = models.map((m) => `    | ${quote(m)}`);
      lines.push(unionLines.join("\n") + ";");
    }
  }
  lines.push("}");
  return lines.join("\n") + "\n";
};

const renderModelsByMode = (
  entries: readonly Entry[],
  modes: readonly string[],
): string => {
  const byMode = new Map<string, string[]>();
  for (const m of modes) byMode.set(m, []);
  for (const e of entries) {
    if (e.mode !== null) byMode.get(e.mode)?.push(e.id);
  }
  const lines: string[] = ["export interface ModelsByMode {"];
  for (const mode of modes) {
    const models = byMode.get(mode) ?? [];
    if (models.length === 0) {
      lines.push(`  ${quote(mode)}: never;`);
    } else {
      lines.push(`  ${quote(mode)}:`);
      const unionLines = models.map((m) => `    | ${quote(m)}`);
      lines.push(unionLines.join("\n") + ";");
    }
  }
  lines.push("}");
  return lines.join("\n") + "\n";
};

const main = async (): Promise<void> => {
  const raw = await loadSource();

  const entries: Entry[] = [];
  for (const [id, model] of Object.entries(raw)) {
    if (SKIP_KEYS.has(id)) continue;
    const entry = buildEntry(id, model);
    if (entry !== null) entries.push(entry);
  }
  entries.sort((a, b) => a.id.localeCompare(b.id));

  const providers = [...new Set(entries.map((e) => e.provider))].sort();
  const modes = [
    ...new Set(entries.map((e) => e.mode).filter((m): m is string => m !== null)),
  ].sort();
  const capabilities = [...new Set(entries.flatMap((e) => e.capabilities))].sort();
  const ids = entries.map((e) => e.id);

  const header = [
    "// AUTO-GENERATED by scripts/generate-models.ts. Do not edit by hand.",
    "// Source: BerriAI/litellm model_prices_and_context_window.json",
    "// Re-run `deno task gen:models` to refresh.",
    "",
  ].join("\n");

  const entryInterface = [
    "/** A single model's metadata derived from the upstream pricing table. */",
    "export interface ModelEntry {",
    "  readonly id: ModelId;",
    "  readonly provider: Provider;",
    "  readonly mode: Mode | null;",
    "  readonly maxInputTokens: number | null;",
    "  readonly maxOutputTokens: number | null;",
    "  readonly inputCostPerToken: number | null;",
    "  readonly outputCostPerToken: number | null;",
    "  readonly capabilities: readonly Capability[];",
    "}",
    "",
  ].join("\n");

  const capabilityHelper = [
    "/** Resolve the literal union of model IDs that declare support for `C`. */",
    "export type ModelsWithCapability<C extends Capability> = ModelsByCapability[C];",
    "",
  ].join("\n");

  const modeHelper = [
    "/** Resolve the literal union of model IDs declared with mode `M`. */",
    "export type ModelsWithMode<M extends Mode> = ModelsByMode[M];",
    "",
  ].join("\n");

  const sections = [
    header,
    renderUnion("Provider", providers),
    "",
    renderUnion("Mode", modes),
    "",
    renderUnion("Capability", capabilities),
    "",
    renderUnion("ModelId", ids),
    "",
    entryInterface,
    renderModels(entries),
    "",
    renderModelsByCapability(entries, capabilities),
    "",
    capabilityHelper,
    renderModelsByMode(entries, modes),
    "",
    modeHelper,
  ];

  await Deno.writeTextFile(OUTPUT_PATH, sections.join("\n"));
  const summary =
    `wrote ${entries.length} models, ${providers.length} providers, ${capabilities.length} capabilities -> ${OUTPUT_PATH.pathname}\n`;
  await Deno.stdout.write(new TextEncoder().encode(summary));
};

if (import.meta.main) {
  await main();
}
