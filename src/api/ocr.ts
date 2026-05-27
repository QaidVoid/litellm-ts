import type { ApiError } from "../error.ts";
import type { ModelsWithMode } from "../models/mod.ts";
import type { Result } from "../result.ts";
import type { Transport } from "../transport.ts";

/**
 * Document descriptor accepted by the OCR endpoint. Discriminated by `type`.
 *
 * The wire shape mirrors Mistral's OCR API. URL variants reference content
 * fetched by the proxy; `file_id` references a previously uploaded file.
 */
export type OcrDocument =
  | {
    readonly type: "document_url";
    /** HTTPS URL of the document (PDF, DOCX, etc.). */
    readonly document_url: string;
  }
  | {
    readonly type: "image_url";
    /** HTTPS URL of an image to OCR. */
    readonly image_url: string;
  }
  | {
    readonly type: "file";
    /** Identifier returned by `files.create`. */
    readonly file_id: string;
  };

/** Bytes-style file input accepted by `ocr.processFile` (multipart). */
export type OcrFileInput = Blob | Uint8Array;

/** Request body for `POST /v1/ocr` when the document is referenced by URL or file id. */
export interface OcrRequest {
  /** OCR-capable model. */
  readonly model: ModelsWithMode<"ocr">;
  /** Document descriptor. */
  readonly document: OcrDocument;
  /** Include base64-encoded inline images in the response. */
  readonly include_image_base64?: boolean;
  /** Restrict OCR to these page indexes (0-based). */
  readonly pages?: readonly number[];
  /** Cap the number of inline images returned per page. */
  readonly image_limit?: number;
  /** Cap the inline image bbox size. */
  readonly image_min_size?: number;
}

/** Request body for `POST /v1/ocr` via multipart file upload. */
export interface OcrFileRequest {
  readonly model: ModelsWithMode<"ocr">;
  readonly file: OcrFileInput;
  /** Filename attached to the multipart payload. Defaults to `"document.pdf"`. */
  readonly filename?: string;
  readonly include_image_base64?: boolean;
  readonly pages?: readonly number[];
  readonly image_limit?: number;
  readonly image_min_size?: number;
}

/** Page dimensions reported by the OCR provider. */
export interface OcrPageDimensions {
  readonly dpi?: number;
  readonly height?: number;
  readonly width?: number;
}

/** An image extracted from an OCR page. */
export interface OcrPageImage {
  /** Base64-encoded inline image bytes when `include_image_base64` was set. */
  readonly image_base64?: string;
  /** Bounding box of the image inside the page. */
  readonly bbox?: Readonly<Record<string, unknown>>;
}

/** A single OCR'd page. */
export interface OcrPage {
  /** Zero-based page index. */
  readonly index: number;
  /** Markdown rendering of the page content. */
  readonly markdown: string;
  readonly images?: readonly OcrPageImage[];
  readonly dimensions?: OcrPageDimensions;
}

/** Token and credit accounting on an `OcrResponse`. */
export interface OcrUsageInfo {
  readonly pages_processed?: number;
  readonly credits?: number;
}

/** Response from `POST /v1/ocr`. */
export interface OcrResponse {
  readonly object: "ocr";
  readonly model: string;
  readonly pages: readonly OcrPage[];
  readonly document_annotation?: unknown;
  readonly usage_info?: OcrUsageInfo;
}

/** Surface for the OCR endpoint on the `Client`. */
export interface OcrNamespace {
  /** OCR a document referenced by URL or by uploaded `file_id`. */
  process(req: OcrRequest): Promise<Result<OcrResponse, ApiError>>;
  /** OCR a local file uploaded as multipart form data. */
  processFile(req: OcrFileRequest): Promise<Result<OcrResponse, ApiError>>;
}

const toBlob = (input: OcrFileInput): Blob =>
  input instanceof Blob ? input : new Blob([input as BlobPart]);

const buildOcrForm = (req: OcrFileRequest): FormData => {
  const fd = new FormData();
  fd.append("file", toBlob(req.file), req.filename ?? "document.pdf");
  fd.append("model", req.model);
  if (req.include_image_base64 !== undefined) {
    fd.append("include_image_base64", String(req.include_image_base64));
  }
  if (req.pages !== undefined) fd.append("pages", JSON.stringify(req.pages));
  if (req.image_limit !== undefined) fd.append("image_limit", String(req.image_limit));
  if (req.image_min_size !== undefined) {
    fd.append("image_min_size", String(req.image_min_size));
  }
  return fd;
};

/** Bind an `OcrNamespace` to a constructed `Transport`. */
export const createOcr = (transport: Transport): OcrNamespace => ({
  process(req) {
    return transport.request<OcrResponse>({
      method: "POST",
      path: "/v1/ocr",
      body: req,
    });
  },
  processFile(req) {
    return transport.request<OcrResponse>({
      method: "POST",
      path: "/v1/ocr",
      body: buildOcrForm(req),
    });
  },
});
