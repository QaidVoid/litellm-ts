import type { ApiError } from "../error.ts";
import type { ModelsWithMode } from "../models/mod.ts";
import type { Result } from "../result.ts";
import type { Transport } from "../transport.ts";

/** Wire format for returned images. */
export type ImageResponseFormat = "url" | "b64_json";

/** Bytes accepted as input by the image-edit endpoint. */
export type ImageInput = Blob | Uint8Array;

/** Request body for `/v1/images/generations`. */
export interface ImageGenerationRequest {
  /** Image-generation-capable model id. */
  readonly model: ModelsWithMode<"image_generation">;
  /** Free-form text description of the image to generate. */
  readonly prompt: string;
  /** Number of images to generate. Provider-specific maximum. */
  readonly n?: number;
  /** Provider-specific size string (e.g. `"1024x1024"`). */
  readonly size?: string;
  /** Output fidelity. Higher levels cost more. */
  readonly quality?: "standard" | "hd";
  /** Artistic style hint. Only some providers honor it. */
  readonly style?: "vivid" | "natural";
  /** Whether `data[i]` contains a `url` or a base64-encoded `b64_json` payload. */
  readonly response_format?: ImageResponseFormat;
  /** Opaque caller identifier forwarded to upstream abuse-detection systems. */
  readonly user?: string;
}

/** Request for `/v1/images/edits`. */
export interface ImageEditRequest {
  /** Image-edit (or generation) capable model id. */
  readonly model: ModelsWithMode<"image_edit"> | ModelsWithMode<"image_generation">;
  /** Source image. Use a `Blob`/`File` to preserve mime type. */
  readonly image: ImageInput;
  /** Optional mask describing the area to edit (transparent = editable). */
  readonly mask?: ImageInput;
  /** Edit instructions. */
  readonly prompt: string;
  /** Filename to attach to the source image. Defaults to `"image.png"`. */
  readonly imageFilename?: string;
  /** Filename to attach to the mask. Defaults to `"mask.png"`. */
  readonly maskFilename?: string;
  /** Number of images to generate. */
  readonly n?: number;
  /** Provider-specific size string (e.g. `"1024x1024"`). */
  readonly size?: string;
  /** Whether `data[i]` contains a `url` or a base64-encoded `b64_json` payload. */
  readonly response_format?: ImageResponseFormat;
  /** Opaque caller identifier forwarded to upstream abuse-detection systems. */
  readonly user?: string;
}

/** A single generated image entry in the response. */
export interface ImageDatum {
  /** Direct URL to the rendered image. Set when `response_format` is `"url"`. */
  readonly url?: string;
  /** Base64-encoded image bytes. Set when `response_format` is `"b64_json"`. */
  readonly b64_json?: string;
  /** Prompt the upstream actually used after safety / rewriting passes. */
  readonly revised_prompt?: string;
}

/** A complete images response. Shared by generations and edits. */
export interface ImageGenerationResponse {
  /** Unix timestamp (seconds) of generation. */
  readonly created: number;
  /** One entry per generated image, in order. */
  readonly data: readonly ImageDatum[];
}

/** Surface for the images endpoint on the `Client`. */
export interface ImagesNamespace {
  /** Generate one or more images from a text prompt. */
  generate(
    req: ImageGenerationRequest,
  ): Promise<Result<ImageGenerationResponse, ApiError>>;
  /**
   * Edit an existing image, optionally restricted to a transparent mask region.
   * Sends a multipart request and returns image entries in the same shape as
   * `generate`.
   */
  edit(req: ImageEditRequest): Promise<Result<ImageGenerationResponse, ApiError>>;
}

const toBlob = (input: ImageInput): Blob =>
  input instanceof Blob ? input : new Blob([input as BlobPart]);

const buildEditForm = (req: ImageEditRequest): FormData => {
  const fd = new FormData();
  fd.append("image", toBlob(req.image), req.imageFilename ?? "image.png");
  if (req.mask !== undefined) {
    fd.append("mask", toBlob(req.mask), req.maskFilename ?? "mask.png");
  }
  fd.append("prompt", req.prompt);
  fd.append("model", req.model);
  if (req.n !== undefined) fd.append("n", String(req.n));
  if (req.size !== undefined) fd.append("size", req.size);
  if (req.response_format !== undefined) fd.append("response_format", req.response_format);
  if (req.user !== undefined) fd.append("user", req.user);
  return fd;
};

/** Bind an `ImagesNamespace` to a constructed `Transport`. */
export const createImages = (transport: Transport): ImagesNamespace => ({
  generate(req) {
    return transport.request<ImageGenerationResponse>({
      method: "POST",
      path: "/v1/images/generations",
      body: req,
    });
  },
  edit(req) {
    return transport.request<ImageGenerationResponse>({
      method: "POST",
      path: "/v1/images/edits",
      body: buildEditForm(req),
    });
  },
});
