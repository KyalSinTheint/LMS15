/**
 * Supabase Storage & Large-File Streaming Uploader for KBZLife LMS
 * Supports direct device uploads up to 1 GB for videos and 100 MB for PDFs
 */

import * as tus from 'tus-js-client';
import { getSupabaseClient, getSupabaseConfig, isSupabaseStorageUrl } from './supabase';
import type { VideoPart } from '../types/lms';

/** Authorization header carrying the signed-in user's Supabase access token. */
async function authHeader(): Promise<Record<string, string>> {
  const client = getSupabaseClient();
  if (!client) return {};
  const { data } = await client.auth.getSession();
  return data.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : {};
}

export interface UploadResult {
  success: boolean;
  url?: string;
  storage_path?: string;
  path?: string;
  fileName?: string;
  size?: number;
  formattedSize?: string;
  error?: string;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/ogg'];
const MAX_VIDEO_SIZE_BYTES = 1024 * 1024 * 1024; // 1 GB per video

const ALLOWED_PDF_TYPES = ['application/pdf'];
const MAX_PDF_SIZE_BYTES = 150 * 1024 * 1024; // 150 MB for PDFs

/**
 * Validates image file type and size
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Unsupported image format. Please select a JPG, PNG, or WebP image.',
    };
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `Image file is too large (${sizeMb} MB). Maximum allowed image size is 10 MB.`,
    };
  }

  return { valid: true };
}

/**
 * Validates lesson file (Video up to 1GB, PDF up to 150MB)
 */
export function validateLessonFile(
  file: File,
  expectedType: 'video' | 'pdf'
): { valid: boolean; error?: string } {
  const extension = (file.name.split('.').pop() || '').toLowerCase();

  if (expectedType === 'video') {
    const isVideoMime = ALLOWED_VIDEO_TYPES.includes(file.type) || file.type.startsWith('video/');
    const isVideoExt = ['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(extension);

    if (!isVideoMime && !isVideoExt) {
      return {
        valid: false,
        error: 'Unsupported video format. Please upload an MP4, WebM, or MOV file.',
      };
    }

    if (file.size > MAX_VIDEO_SIZE_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      return {
        valid: false,
        error: `Video exceeds the 1 GB maximum limit (${sizeMb} MB). Please compress or select a video under 1 GB.`,
      };
    }

    return { valid: true };
  }

  if (expectedType === 'pdf') {
    const isPdfMime = file.type === 'application/pdf';
    const isPdfExt = extension === 'pdf';

    if (!isPdfMime && !isPdfExt) {
      return {
        valid: false,
        error: 'Unsupported document format. Please upload a PDF file (.pdf).',
      };
    }

    if (file.size > MAX_PDF_SIZE_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      return {
        valid: false,
        error: `PDF document is too large (${sizeMb} MB). Maximum allowed PDF size is 150 MB.`,
      };
    }

    return { valid: true };
  }

  return { valid: true };
}

/**
 * Uploads an image file to Supabase Storage or persistent server fallback
 */
export async function uploadImageFile(
  file: File,
  bucketName: string = 'company-news'
): Promise<UploadResult> {
  const validation = validateImageFile(file);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_').toLowerCase();
  const baseName = `${timestamp}_${randomStr}_${sanitizedName}`;

  // 1. Direct Supabase Storage attempt
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      // Keep each user's files in their own folder (e.g. profile-pictures/<user-id>/...)
      const userId = (await supabase.auth.getSession()).data.session?.user.id;
      const storagePath = userId ? `${userId}/${baseName}` : baseName;
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from(bucketName)
        .upload(storagePath, file, {
          cacheControl: '3600',
          // Paths are unique, so never overwrite. upsert would also require an
          // UPDATE storage policy, which ordinary users don't have.
          upsert: false,
          contentType: file.type,
        });

      if (uploadErr) {
        console.warn('[KBZLife Storage] Direct Supabase upload failed, trying server route:', uploadErr.message);
      }
      if (!uploadErr && uploadData?.path) {
        const { data: publicUrlData } = supabase.storage
          .from(bucketName)
          .getPublicUrl(uploadData.path);

        if (publicUrlData?.publicUrl) {
          return {
            success: true,
            url: publicUrlData.publicUrl,
            storage_path: uploadData.path,
            path: uploadData.path,
            size: file.size,
            formattedSize: formatBytes(file.size),
          };
        }
      }
    } catch (err: unknown) {
      console.warn('[KBZLife Storage] Client upload attempt skipped to server route:', err);
    }
  }

  // 2. Fallback to Server Upload Handler
  try {
    const reader = new FileReader();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read image file.'));
      reader.readAsDataURL(file);
    });

    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
      body: JSON.stringify({
        fileName: file.name,
        fileType: file.type,
        dataUrl,
        bucket: bucketName,
      }),
    });

    const result = await res.json();
    if (res.ok && result.success && result.url) {
      return {
        success: true,
        url: result.url,
        storage_path: result.fileName,
        path: result.fileName,
        size: file.size,
        formattedSize: formatBytes(file.size),
      };
    }

    return {
      success: false,
      error: result.message || 'Image upload failed. Please try again.',
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg || 'Upload failed due to network error.' };
  }
}


/**
 * Explains a failed Supabase Storage upload in plain words.
 */
function describeStorageError(err: unknown, bucket: string): string {
  const anyErr = err as { message?: string; originalResponse?: { getStatus?: () => number; getBody?: () => string } };
  const status = anyErr?.originalResponse?.getStatus?.() ?? 0;
  const body = anyErr?.originalResponse?.getBody?.() || '';
  const text = `${anyErr?.message || ''} ${body}`.toLowerCase();

  if (status === 413 || text.includes('maximum allowed size') || text.includes('payload too large') || text.includes('too large')) {
    return 'This file is larger than the Supabase Storage upload limit. Raise it in Supabase → Storage → Settings → "Upload file size limit" (the Free plan allows up to 50 MB per file), or upload a smaller file.';
  }
  if (text.includes('bucket not found') || (status === 404 && text.includes('bucket'))) {
    return `The storage bucket "${bucket}" does not exist. Run the SQL files in supabase/migrations in the Supabase SQL Editor.`;
  }
  if (status === 401 || status === 403 || text.includes('row-level security') || text.includes('unauthorized')) {
    return 'You do not have permission to upload this file. Please sign out, sign in again and retry.';
  }
  if (text.includes('mime type') || text.includes('invalid_mime_type')) {
    return 'This file type is not allowed by the storage bucket settings.';
  }
  return anyErr?.message ? `Upload failed: ${anyErr.message}` : 'Upload failed. Please check your connection and try again.';
}

/**
 * Uploads a large file straight from the browser to Supabase Storage using the
 * resumable (TUS) protocol: 6 MB chunks, progress, automatic retries and
 * resume after a dropped connection. Works without the Node server (e.g. on Vercel).
 */
async function uploadToSupabaseResumable(
  file: File,
  bucket: string,
  onProgress?: (progressPct: number, loadedBytes: number, totalBytes: number) => void,
  signal?: AbortSignal
): Promise<UploadResult> {
  const supabase = getSupabaseClient();
  const { url, anonKey } = getSupabaseConfig();
  if (!supabase || !url) return { success: false, error: 'Supabase is not configured.' };

  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;
  if (!session) return { success: false, error: 'Your session has expired. Please sign in again before uploading.' };

  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_').toLowerCase();
  const objectName = `${session.user.id}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}_${sanitizedName}`;

  return new Promise<UploadResult>((resolve) => {
    let settled = false;
    const finish = (result: UploadResult) => {
      if (!settled) {
        settled = true;
        resolve(result);
      }
    };

    const upload = new tus.Upload(file, {
      endpoint: `${url.replace(/\/$/, '')}/storage/v1/upload/resumable`,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        authorization: `Bearer ${session.access_token}`,
        apikey: anonKey,
        'x-upsert': 'false',
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      chunkSize: 6 * 1024 * 1024, // Supabase requires exactly 6 MB chunks
      metadata: {
        bucketName: bucket,
        objectName,
        contentType: file.type || 'application/octet-stream',
        cacheControl: '3600',
      },
      onProgress: (sent, total) => {
        onProgress?.(Math.min(100, Math.round((sent / Math.max(1, total)) * 100)), sent, total);
      },
      onError: (err) => {
        console.warn('[KBZLife Storage] Resumable upload failed:', err);
        finish({ success: false, error: describeStorageError(err, bucket) });
      },
      onSuccess: () => {
        const { data } = supabase.storage.from(bucket).getPublicUrl(objectName);
        finish({
          success: true,
          url: data.publicUrl,
          storage_path: objectName,
          path: objectName,
          fileName: file.name,
          size: file.size,
          formattedSize: formatBytes(file.size),
        });
      },
    });

    if (signal) {
      if (signal.aborted) return finish({ success: false, error: 'Upload was cancelled by user.' });
      signal.addEventListener('abort', () => {
        upload.abort(true).catch(() => {});
        finish({ success: false, error: 'Upload was cancelled by user.' });
      });
    }

    upload
      .findPreviousUploads()
      .then((previous) => {
        if (previous.length > 0) upload.resumeFromPreviousUpload(previous[0]);
        upload.start();
      })
      .catch(() => upload.start());
  });
}

/**
 * Resumable & Chunked Upload for Large Files up to 1 GB (Videos & PDFs)
 * Never loads the entire file into browser memory as base64.
 * Uses 5 MB chunks with real progress tracking and cancellation support.
 */
export async function uploadLargeFileChunked(
  fileOrOptions:
    | File
    | {
        file: File;
        bucket: string;
        onProgress?: (progressPct: number, loadedBytes: number, totalBytes: number) => void;
        signal?: AbortSignal;
      },
  bucketArg?: string,
  onProgressArg?: (progressPct: number, loadedBytes: number, totalBytes: number) => void,
  signalArg?: AbortSignal
): Promise<UploadResult> {
  let file: File;
  let bucket: string;
  let onProgress: ((progressPct: number, loadedBytes: number, totalBytes: number) => void) | undefined;
  let signal: AbortSignal | undefined;

  if (fileOrOptions instanceof File) {
    file = fileOrOptions;
    bucket = bucketArg || 'uploads';
    onProgress = onProgressArg;
    signal = signalArg;
  } else {
    file = fileOrOptions.file;
    bucket = fileOrOptions.bucket;
    onProgress = fileOrOptions.onProgress;
    signal = fileOrOptions.signal;
  }

  // Preferred path: straight to Supabase Storage (works on static hosting like Vercel)
  if (getSupabaseClient()) {
    return uploadToSupabaseResumable(file, bucket, onProgress, signal);
  }

  // Fallback (no Supabase configured): upload through the local Node server
  const CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB per chunk
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  const uploadId = `up_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  let uploadedBytes = 0;
  const headersAuth = await authHeader();

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    if (signal?.aborted) {
      return { success: false, error: 'Upload was cancelled by user.' };
    }

    const start = chunkIndex * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunkBlob = file.slice(start, end);

    try {
      const response = await fetch('/api/upload/chunk', {
        method: 'POST',
        headers: {
          'x-upload-id': uploadId,
          'x-file-name': encodeURIComponent(file.name),
          'x-chunk-index': String(chunkIndex),
          'x-total-chunks': String(totalChunks),
          'x-file-type': file.type || 'application/octet-stream',
          'x-bucket': bucket,
          'Content-Type': 'application/octet-stream',
          ...headersAuth,
        },
        body: chunkBlob,
        signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errMsg = 'Failed to upload file chunk.';
        try {
          const errObj = JSON.parse(errorText);
          if (errObj.message) errMsg = errObj.message;
        } catch {}
        return { success: false, error: errMsg };
      }

      const result = await response.json();
      uploadedBytes += end - start;

      const progress = Math.min(100, Math.round((uploadedBytes / file.size) * 100));
      if (onProgress) {
        onProgress(progress, uploadedBytes, file.size);
      }

      if (result.complete && result.url) {
        const finalSize = result.size || file.size;
        return {
          success: true,
          url: result.url,
          storage_path: result.storage_path || result.fileName,
          path: result.storage_path || result.fileName,
          fileName: result.fileName,
          size: finalSize,
          formattedSize: formatBytes(finalSize),
        };
      }
    } catch (err: unknown) {
      if (signal?.aborted) {
        return { success: false, error: 'Upload cancelled.' };
      }
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: `Upload error on chunk ${chunkIndex + 1}/${totalChunks}: ${msg}` };
    }
  }

  return { success: false, error: 'Upload completed but server did not return a valid URL.' };
}

/** 75 → "1:15", 3725 → "1:02:05" */
export function formatVideoClock(totalSeconds: number): string {
  const t = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = String(t % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

/** Reads a local video's length in seconds; 0 when the browser cannot tell. */
function probeVideoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    const done = (value: number) => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(value) && value > 0 ? value : 0);
    };
    video.preload = 'metadata';
    video.onloadedmetadata = () => done(video.duration);
    video.onerror = () => done(0);
    video.src = url;
  });
}

export interface VideoUploadResult extends UploadResult {
  /** Set when the video was larger than the storage limit and was uploaded in parts. */
  parts?: VideoPart[];
  /** Whole-video length in seconds, when known. */
  durationSeconds?: number;
}

/**
 * Uploads a lesson video. Videos over ~48 MB are split into parts under the
 * 50 MB Supabase per-file limit (in the browser, without re-encoding) and each
 * part is uploaded; learners see them play back-to-back as one video.
 */
export async function uploadVideoWithAutoSplit(
  file: File,
  bucket: string,
  onStatus: (percent: number, message: string) => void,
  signal?: AbortSignal
): Promise<VideoUploadResult> {
  const upload = (f: File, onProgress: (pct: number, loaded: number, total: number) => void) =>
    uploadLargeFileChunked(f, bucket, onProgress, signal);

  const { needsVideoSplit, splitVideoIntoParts } = await import('./videoSplitter');
  if (!getSupabaseClient() || !needsVideoSplit(file)) {
    const result = await upload(file, (pct, loaded, total) =>
      onStatus(pct, `Uploading: ${formatBytes(loaded)} / ${formatBytes(total)} (${pct}%)`)
    );
    return { ...result, parts: [] };
  }

  const knownDuration = await probeVideoDuration(file);
  let pieces;
  try {
    pieces = await splitVideoIntoParts(file, {
      knownDuration,
      signal,
      // Splitting is the first 30% of the progress bar, uploading the remaining 70%
      onProgress: (p) => {
        const base = p.stage === 'loading' ? 0 : p.stage === 'splitting' ? 2 : 25;
        const span = p.stage === 'loading' ? 2 : p.stage === 'splitting' ? 23 : 5;
        onStatus(Math.round(base + (p.percent / 100) * span), p.message);
      },
    });
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') return { success: false, error: 'Upload was cancelled by user.' };
    return { success: false, error: (err as Error)?.message || 'The video could not be split into parts.' };
  }

  const totalBytes = pieces.reduce((sum, p) => sum + p.file.size, 0);
  const parts: VideoPart[] = [];
  let doneBytes = 0;
  for (let i = 0; i < pieces.length; i++) {
    const piece = pieces[i];
    const result = await upload(piece.file, (_pct, loaded) => {
      const sent = doneBytes + loaded;
      const pct = Math.round(30 + (sent / Math.max(1, totalBytes)) * 70);
      onStatus(
        Math.min(100, pct),
        `Uploading part ${i + 1} of ${pieces.length}: ${formatBytes(sent)} / ${formatBytes(totalBytes)}`
      );
    });
    if (!result.success || !result.url) {
      return {
        success: false,
        error: `Part ${i + 1} of ${pieces.length} could not be uploaded. ${result.error || ''}`.trim(),
      };
    }
    doneBytes += piece.file.size;
    parts.push({
      url: result.url,
      path: result.path,
      size: piece.file.size,
      start: piece.start,
      duration: piece.duration,
    });
  }

  const durationSeconds = parts.reduce((sum, p) => sum + p.duration, 0) || knownDuration;
  return {
    success: true,
    url: parts[0].url,
    path: parts[0].path,
    storage_path: parts[0].path,
    fileName: file.name,
    size: file.size,
    formattedSize: formatBytes(file.size),
    parts,
    durationSeconds,
  };
}

/**
 * Attempts to inspect the duration of an uploaded video file in the browser
 */
export function estimateVideoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    try {
      const video = document.createElement('video');
      video.preload = 'metadata';
      const url = URL.createObjectURL(file);
      video.src = url;

      video.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        const durationSeconds = Math.round(video.duration);
        if (isNaN(durationSeconds) || durationSeconds <= 0) {
          resolve(900);
          return;
        }
        resolve(durationSeconds);
      };

      video.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(900);
      };
    } catch {
      resolve(900);
    }
  });
}

/**
 * Triggers a real browser file download using /api/download to force Content-Disposition: attachment
 */
export function triggerFileDownload(fileUrl: string, fileName?: string, role: string = 'user') {
  if (!fileUrl) return;
  const targetFileName = fileName || fileUrl.split('/').pop() || 'download';
  // Supabase Storage forces "Save as" itself via ?download=<name>; other URLs use the server route
  const downloadUrl = isSupabaseStorageUrl(fileUrl)
    ? `${fileUrl}${fileUrl.includes('?') ? '&' : '?'}download=${encodeURIComponent(targetFileName)}`
    : `/api/download?url=${encodeURIComponent(fileUrl)}&filename=${encodeURIComponent(targetFileName)}&role=${encodeURIComponent(role)}`;

  const link = document.createElement('a');
  link.href = downloadUrl;
  link.setAttribute('download', targetFileName);
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    try {
      document.body.removeChild(link);
    } catch {}
  }, 100);
}


