/**
 * Build an npm-compatible artifact in `./npm` using `@deno/dnt`.
 *
 * The SDK uses only Web Platform APIs (`fetch`, `AbortSignal.any`,
 * `TextDecoder`, `FormData`, `ReadableStream`), so no Deno shim is needed.
 *
 * Usage:
 *   deno task build:npm
 */

import { build, emptyDir } from "@deno/dnt";

const OUT_DIR = "./npm";

interface DenoConfig {
  readonly name: string;
  readonly version: string;
  readonly license?: string;
}

const denoConfig: DenoConfig = JSON.parse(
  await Deno.readTextFile("./deno.json"),
);

const NPM_METADATA = {
  description: "Type-safe TypeScript SDK for LiteLLM.",
  author: "Rabindra Dhakal <contact@qaidvoid.dev>",
  repository: {
    type: "git",
    url: "git+https://github.com/qaidvoid/litellm-ts.git",
  },
  bugs: {
    url: "https://github.com/qaidvoid/litellm-ts/issues",
  },
  keywords: [
    "litellm",
    "llm",
    "openai",
    "anthropic",
    "sdk",
    "typescript",
    "deno",
  ],
} as const;

await emptyDir(OUT_DIR);

await build({
  entryPoints: ["./mod.ts"],
  outDir: OUT_DIR,
  shims: {
    deno: false,
  },
  test: false,
  typeCheck: "both",
  compilerOptions: {
    lib: ["ES2022", "DOM"],
    target: "ES2022",
  },
  package: {
    name: denoConfig.name,
    version: denoConfig.version,
    ...(denoConfig.license === undefined ? {} : { license: denoConfig.license }),
    description: NPM_METADATA.description,
    author: NPM_METADATA.author,
    repository: NPM_METADATA.repository,
    bugs: NPM_METADATA.bugs,
    keywords: [...NPM_METADATA.keywords],
  },
  async postBuild() {
    await Deno.copyFile("LICENSE", `${OUT_DIR}/LICENSE`);
    await Deno.copyFile("README.md", `${OUT_DIR}/README.md`);
  },
});
