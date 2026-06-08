import * as tus from "tus-js-client";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

// Files at/above this size go through resumable (TUS) uploads; smaller ones
// use a single PUT with XHR for progress.
const RESUMABLE_THRESHOLD = 6 * 1024 * 1024; // 6MB (Supabase docs)
const CHUNK_SIZE = 6 * 1024 * 1024; // 6MB chunks (required by Supabase TUS)

export type UploadOptions = {
  bucket: string;
  path: string;
  file: File;
  upsert?: boolean;
  onProgress?: (pct: number, loaded: number, total: number) => void;
  signal?: AbortSignal;
};

async function getAccessToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("You must be signed in to upload");
  return token;
}

function uploadResumable(opts: UploadOptions, token: string) {
  const { bucket, path, file, upsert = false, onProgress, signal } = opts;
  return new Promise<void>((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint: `${SUPABASE_URL}/storage/v1/upload/resumable`,
      retryDelays: [0, 1000, 3000, 5000, 10000],
      headers: {
        authorization: `Bearer ${token}`,
        "x-upsert": String(upsert),
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      chunkSize: CHUNK_SIZE,
      metadata: {
        bucketName: bucket,
        objectName: path,
        contentType: file.type || "application/octet-stream",
        cacheControl: "3600",
      },
      onError: (err) => reject(err),
      onProgress: (loaded, total) => {
        onProgress?.(Math.round((loaded / total) * 100), loaded, total);
      },
      onSuccess: () => resolve(),
    });

    signal?.addEventListener("abort", () => {
      upload.abort(true).finally(() => reject(new DOMException("Aborted", "AbortError")));
    });

    // Resume an interrupted upload if one exists for this file.
    upload.findPreviousUploads().then((prev) => {
      if (prev.length) upload.resumeFromPreviousUpload(prev[0]);
      upload.start();
    });
  });
}

async function uploadDirect(opts: UploadOptions, token: string) {
  const { bucket, path, file, upsert = false, onProgress, signal } = opts;
  const url = `${SUPABASE_URL}/storage/v1/object/${bucket}/${encodeURI(path)}`;
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.setRequestHeader("authorization", `Bearer ${token}`);
    xhr.setRequestHeader("x-upsert", String(upsert));
    xhr.setRequestHeader("cache-control", "max-age=3600");
    if (file.type) xhr.setRequestHeader("content-type", file.type);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress?.(Math.round((e.loaded / e.total) * 100), e.loaded, e.total);
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed (${xhr.status}): ${xhr.responseText}`));
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.onabort = () => reject(new DOMException("Aborted", "AbortError"));
    signal?.addEventListener("abort", () => xhr.abort());

    // Send the file bytes directly. A previous FormData upload path forced
    // `content-type: image/*`, causing the multipart wrapper bytes to be
    // stored as the image itself and producing broken image icons.
    xhr.send(file);
  });
}

/**
 * Upload a file directly to Supabase Storage from the browser.
 * - Files >= 6MB use resumable (TUS) uploads with 6MB chunks.
 * - Smaller files use a single request with XHR-based progress.
 * Progress is reported as a percentage 0–100.
 */
export async function uploadToStorage(opts: UploadOptions): Promise<void> {
  const token = await getAccessToken();
  opts.onProgress?.(0, 0, opts.file.size);
  if (opts.file.size >= RESUMABLE_THRESHOLD) {
    await uploadResumable(opts, token);
  } else {
    await uploadDirect(opts, token);
  }
  opts.onProgress?.(100, opts.file.size, opts.file.size);
}
