import { assert, assertStrictEquals } from "@std/assert";
import { e2eTest } from "./_helpers.ts";

// OCR is wired to Mistral / docTR-style providers. With only Ollama
// available the proxy returns 500 ("OCR is not supported for provider").
// Both methods are smoke-tested for routing only.

e2eTest("ocr.process routes to POST /v1/ocr with a URL document", async ({ client, models }) => {
  const result = await client.ocr.process({
    model: models.chat,
    document: {
      type: "document_url",
      document_url: "https://example.com/fake.pdf",
    },
  });

  if (!result.ok) {
    assertStrictEquals(result.error.kind, "http");
    if (result.error.kind === "http") {
      assert(
        result.error.status === 500 || result.error.status === 400,
        `unexpected status: ${result.error.status}`,
      );
    }
    return;
  }
  assertStrictEquals(result.value.object, "ocr");
  assert(Array.isArray(result.value.pages));
}, { requires: ["chat"] });

e2eTest("ocr.processFile sends multipart to /v1/ocr", async ({ client, models }) => {
  const bytes = new Blob([new Uint8Array(2048)], { type: "application/pdf" });
  const result = await client.ocr.processFile({
    model: models.chat,
    file: bytes,
    filename: "test.pdf",
  });

  if (!result.ok) {
    assertStrictEquals(result.error.kind, "http");
    if (result.error.kind === "http") {
      assert(
        result.error.status === 500 || result.error.status === 400,
        `unexpected status: ${result.error.status}`,
      );
    }
    return;
  }
  assertStrictEquals(result.value.object, "ocr");
}, { requires: ["chat"] });
