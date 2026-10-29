export interface ImageLoadResult {
  dataUrl: string;
  width: number;
  height: number;
}

export interface ImageUploadOptions {
  acceptedTypes: string[];
  maxSizeBytes: number;
}

export const DEFAULT_IMAGE_OPTIONS: ImageUploadOptions = {
  acceptedTypes: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp"],
  maxSizeBytes: 10 * 1024 * 1024, // 10 MB
};

export class ImageUploadError extends Error {
  code: "INVALID_FILE" | "IMAGE_NOT_READY" | "FILE_TOO_LARGE" | "UNSUPPORTED_TYPE";
  constructor(code: ImageUploadError["code"], message: string) {
    super(message);
    this.code = code;
    this.name = "ImageUploadError";
  }
}

function validateFile(file: File, options: ImageUploadOptions): void {
  if (!options.acceptedTypes.includes(file.type)) {
    throw new ImageUploadError("UNSUPPORTED_TYPE", `Unsupported file type: ${file.type || "unknown"}`);
  }
  if (file.size > options.maxSizeBytes) {
    throw new ImageUploadError(
      "FILE_TOO_LARGE",
      `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max ${(options.maxSizeBytes / 1024 / 1024).toFixed(0)} MB.`,
    );
  }
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new ImageUploadError("INVALID_FILE", "Failed to read image file."));
    reader.onabort = () => reject(new ImageUploadError("INVALID_FILE", "Image read was aborted."));
    reader.readAsDataURL(file);
  });
}

function waitForImageDecode(img: HTMLImageElement, timeoutMs = 15000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
      resolve();
      return;
    }
    let timer: ReturnType<typeof setTimeout> | null = null;
    const cleanup = () => {
      if (timer) clearTimeout(timer);
      img.removeEventListener("load", onLoad);
      img.removeEventListener("error", onError);
    };
    const onLoad = () => {
      cleanup();
      if (img.naturalWidth > 0 && img.naturalHeight > 0) resolve();
      else reject(new ImageUploadError("IMAGE_NOT_READY", "Image decoded with invalid dimensions."));
    };
    const onError = () => {
      cleanup();
      reject(new ImageUploadError("IMAGE_NOT_READY", "Failed to decode image. The file may be corrupted."));
    };
    img.addEventListener("load", onLoad, { once: true });
    img.addEventListener("error", onError, { once: true });
    timer = setTimeout(() => {
      cleanup();
      reject(new ImageUploadError("IMAGE_NOT_READY", "Image decoding timed out."));
    }, timeoutMs);
  });
}

function downscaleDataUrlIfNeeded(dataUrl: string, maxDimension = 2048): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth <= maxDimension && img.naturalHeight <= maxDimension) {
        resolve(dataUrl);
        return;
      }
      try {
        const scale = Math.min(maxDimension / img.naturalWidth, maxDimension / img.naturalHeight);
        const w = Math.round(img.naturalWidth * scale);
        const h = Math.round(img.naturalHeight * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.92));
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export async function readFileAsDataUrl(
  file: File,
  options: ImageUploadOptions = DEFAULT_IMAGE_OPTIONS,
): Promise<string> {
  validateFile(file, options);
  const rawUrl = await readAsDataUrl(file);
  if (file.size > 2.5 * 1024 * 1024) {
    return downscaleDataUrlIfNeeded(rawUrl);
  }
  return rawUrl;
}

export async function loadImageFile(
  file: File,
  img: HTMLImageElement,
  options: ImageUploadOptions = DEFAULT_IMAGE_OPTIONS,
): Promise<ImageLoadResult> {
  validateFile(file, options);
  const dataUrl = await readFileAsDataUrl(file, options);
  img.src = dataUrl;
  await waitForImageDecode(img);
  return { dataUrl, width: img.naturalWidth, height: img.naturalHeight };
}

export function resetImage(
  img: HTMLImageElement,
  wrapper: HTMLElement,
  fitControl: HTMLElement | null,
  positionControl: HTMLElement | null,
  fitSelect: HTMLSelectElement | null,
  posSelect: HTMLSelectElement | null,
  fileInput: HTMLInputElement | null,
): void {
  img.src = "";
  img.style.objectFit = "contain";
  img.style.aspectRatio = "unset";
  img.style.width = "auto";
  img.style.height = "auto";
  wrapper.classList.remove("has-image");
  if (fitSelect) fitSelect.value = "contain";
  if (posSelect) posSelect.value = "below";
  if (fitControl) fitControl.style.display = "none";
  if (positionControl) positionControl.style.display = "none";
  if (fileInput) fileInput.value = "";
}
