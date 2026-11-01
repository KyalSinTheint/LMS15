/**
 * PDF Utilities & Worker Configuration for KBZLIFE LMS
 * High-performance rendering of PDF first-page previews and full documents
 */
import * as pdfjsLib from 'pdfjs-dist';
import { isSupabaseStorageUrl } from './supabase';

// pdf.js worker and helper data are copied from node_modules into public/pdfjs/
// at dev/build time (scripts/copy-pdfjs-assets.mjs), so they always match the
// installed library version.
const PDFJS_ASSET_BASE = '/pdfjs/';
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `${PDFJS_ASSET_BASE}pdf.worker.min.mjs`;
}

/**
 * Returns a browser-accessible, CORS-safe, and frame-friendly URL for any PDF.
 * If the file is local (/uploads/... or /api/...), returns directly.
 * If data URL, returns as-is.
 * If external (e.g. Supabase, external cloud bucket, or external site), routes via /api/pdf-stream.
 */
export function getPdfStreamUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  const trimmed = rawUrl.trim();
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }
  if (trimmed.startsWith('/uploads/') || trimmed.startsWith('/api/')) {
    return trimmed;
  }
  // External or relative path
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    // If it's the current host, keep path
    try {
      const urlObj = new URL(trimmed);
      if (typeof window !== 'undefined' && urlObj.host === window.location.host) {
        return urlObj.pathname + urlObj.search;
      }
    } catch {}
    // Supabase Storage files are served with CORS headers: load them directly
    if (isSupabaseStorageUrl(trimmed)) return trimmed;
    return `/api/pdf-stream?url=${encodeURIComponent(trimmed)}`;
  }
  if (trimmed.startsWith('/')) {
    return trimmed;
  }
  return `/uploads/${trimmed}`;
}

// In-memory cache for rendered first-page thumbnails to avoid re-rendering on tab switch
const thumbnailMemoryCache = new Map<string, string>();

/**
 * Gets cached first-page preview data URL if available
 */
export function getCachedPdfThumbnail(url: string): string | null {
  if (!url) return null;
  if (thumbnailMemoryCache.has(url)) {
    return thumbnailMemoryCache.get(url)!;
  }
  if (typeof window !== 'undefined') {
    try {
      const saved = sessionStorage.getItem(`pdf_thumb_${url}`);
      if (saved) {
        thumbnailMemoryCache.set(url, saved);
        return saved;
      }
    } catch {}
  }
  return null;
}

/**
 * Stores rendered first-page thumbnail in memory and sessionStorage
 */
export function setCachedPdfThumbnail(url: string, dataUrl: string): void {
  if (!url || !dataUrl) return;
  thumbnailMemoryCache.set(url, dataUrl);
  if (typeof window !== 'undefined') {
    try {
      // Only cache reasonably sized data URLs in sessionStorage (under 200KB)
      if (dataUrl.length < 250000) {
        sessionStorage.setItem(`pdf_thumb_${url}`, dataUrl);
      }
    } catch {
      // sessionStorage full or disabled
    }
  }
}

/**
 * Turns a pdf.js loading error into a message an admin or learner can act on.
 */
export function describePdfLoadError(err: unknown, url: string): string {
  const e = err as { name?: string; message?: string; status?: number };
  const status = typeof e?.status === 'number' ? e.status : Number((e?.message || '').match(/\b(4\d\d|5\d\d)\b/)?.[1] || 0);
  const isLocalUpload = url.trim().startsWith('/uploads/') || url.includes('/api/storage/uploads/');

  if (status === 404 || e?.name === 'MissingPDFException') {
    return isLocalUpload
      ? 'This PDF was saved on a local development server and is not available online. Please ask an administrator to upload it again.'
      : 'The PDF file could not be found in storage. Please ask an administrator to upload it again.';
  }
  if (status === 400 || status === 401 || status === 403) {
    return 'You do not have access to this PDF file (the storage bucket may be private). Please contact an administrator.';
  }
  if (e?.name === 'InvalidPDFException') {
    return isLocalUpload
      ? 'This PDF was saved on a local development server and is not available online. Please ask an administrator to upload it again.'
      : 'This file is not a valid PDF, or it could not be downloaded completely. Please ask an administrator to upload it again.';
  }
  if (e?.name === 'PasswordException') {
    return 'This PDF is password-protected and cannot be displayed. Please upload a version without a password.';
  }
  return e?.message ? `Could not open the PDF: ${e.message}` : 'Could not open the PDF. Please check your connection and try again.';
}

/**
 * Loads a PDF document from URL using PDF.js
 */
export async function loadPdfDocument(url: string): Promise<pdfjsLib.PDFDocumentProxy> {
  const streamUrl = getPdfStreamUrl(url);
  const loadingTask = pdfjsLib.getDocument({
    url: streamUrl,
    // Needed by many real-world PDFs: CJK/CID fonts (CMaps), non-embedded
    // standard fonts, scanned images (JBIG2/JPEG 2000 wasm decoders) and
    // colour profiles. Previously the CMap URL pointed to a non-existent
    // "@legacy" tag and the others were missing, so such PDFs failed.
    cMapUrl: `${PDFJS_ASSET_BASE}cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${PDFJS_ASSET_BASE}standard_fonts/`,
    wasmUrl: `${PDFJS_ASSET_BASE}wasm/`,
    iccUrl: `${PDFJS_ASSET_BASE}iccs/`,
  });
  try {
    return await loadingTask.promise;
  } catch (err) {
    throw new Error(describePdfLoadError(err, url));
  }
}

/**
 * Renders the first page of a PDF to an image data URL (PNG)
 */
export async function renderFirstPageToDataUrl(
  url: string,
  targetWidth = 560
): Promise<string> {
  const cached = getCachedPdfThumbnail(url);
  if (cached) return cached;

  const doc = await loadPdfDocument(url);
  const page = await doc.getPage(1);
  const unscaledViewport = page.getViewport({ scale: 1 });
  const scale = targetWidth / unscaledViewport.width;
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D context not available');

  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);

  await page.render({
    canvasContext: context,
    viewport,
    canvas,
  }).promise;

  const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
  setCachedPdfThumbnail(url, dataUrl);
  return dataUrl;
}
