/**
 * Splits a long video into parts that each fit the Supabase Storage per-file
 * limit (50 MB on the Free plan), entirely in the admin's browser.
 *
 * Uses ffmpeg.wasm with stream copy (no re-encoding), so quality is unchanged
 * and splitting is fast. Parts are cut on keyframes and play back-to-back in
 * the learner's video player.
 */
import { FFmpeg, FFFSType } from '@ffmpeg/ffmpeg';

/** Supabase Free plan: maximum size of one stored file. */
export const STORAGE_FILE_LIMIT_BYTES = 50 * 1024 * 1024;
/** Videos above this size are split before upload (small margin under the limit). */
export const VIDEO_SPLIT_THRESHOLD_BYTES = 48 * 1024 * 1024;
/** Average size we aim for per part; leaves room for bitrate spikes. */
const TARGET_PART_BYTES = 38 * 1024 * 1024;
/** Every part must stay under this, otherwise we split again with shorter parts. */
const MAX_PART_BYTES = 49 * 1024 * 1024;

const LOCAL_CORE_BASE = '/ffmpeg/';
const CDN_CORE_BASE = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm/';

export interface SplitVideoPart {
  file: File;
  start: number; // seconds from the start of the whole video
  duration: number; // seconds
}

export interface SplitProgress {
  stage: 'loading' | 'splitting' | 'reading';
  /** 0-100 for the current stage */
  percent: number;
  message: string;
}

export function needsVideoSplit(file: File): boolean {
  return file.size > VIDEO_SPLIT_THRESHOLD_BYTES;
}

let ffmpegInstance: FFmpeg | null = null;
let ffmpegLoading: Promise<FFmpeg> | null = null;

async function getFfmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance;
  if (ffmpegLoading) return ffmpegLoading;

  ffmpegLoading = (async () => {
    const tryLoad = async (base: string) => {
      const ff = new FFmpeg();
      const origin = base.startsWith('http') ? '' : window.location.origin;
      await ff.load({
        coreURL: `${origin}${base}ffmpeg-core.js`,
        wasmURL: `${origin}${base}ffmpeg-core.wasm`,
      });
      return ff;
    };
    try {
      return await tryLoad(LOCAL_CORE_BASE);
    } catch (err) {
      console.warn('[KBZLife Video] Local ffmpeg core failed to load, trying CDN:', err);
      return await tryLoad(CDN_CORE_BASE);
    }
  })();

  try {
    ffmpegInstance = await ffmpegLoading;
    return ffmpegInstance;
  } finally {
    ffmpegLoading = null;
  }
}

function resetFfmpeg() {
  try {
    ffmpegInstance?.terminate();
  } catch {
    /* already gone */
  }
  ffmpegInstance = null;
}

function outputFormat(file: File): { ext: string; mime: string; muxerOptions: string[] } {
  const name = file.name.toLowerCase();
  if (file.type === 'video/webm' || name.endsWith('.webm')) {
    return { ext: 'webm', mime: 'video/webm', muxerOptions: [] };
  }
  // MP4/MOV/M4V/MKV with browser codecs (H.264/AAC) → MP4 parts that start playing immediately
  return { ext: 'mp4', mime: 'video/mp4', muxerOptions: ['-segment_format_options', 'movflags=+faststart'] };
}

function parseDurationFromLog(lines: string[]): number {
  for (const line of lines) {
    const m = line.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
    if (m) return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
  }
  return 0;
}

/**
 * Splits `file` into parts under 50 MB each. Throws with a readable message on failure.
 * `knownDuration` (seconds) improves the first size estimate when available.
 */
export async function splitVideoIntoParts(
  file: File,
  options: {
    knownDuration?: number;
    onProgress?: (p: SplitProgress) => void;
    signal?: AbortSignal;
  } = {}
): Promise<SplitVideoPart[]> {
  const { onProgress, signal } = options;
  const abortError = () => Object.assign(new Error('Video splitting was cancelled.'), { name: 'AbortError' });
  if (signal?.aborted) throw abortError();

  onProgress?.({ stage: 'loading', percent: 0, message: 'Loading the video splitter (first time only, ~30 MB)…' });
  const ffmpeg = await getFfmpeg();
  if (signal?.aborted) throw abortError();

  const onAbort = () => resetFfmpeg();
  signal?.addEventListener('abort', onAbort);

  const logs: string[] = [];
  const onLog = ({ message }: { message: string }) => {
    logs.push(message);
    if (logs.length > 400) logs.shift();
  };
  const onFfProgress = ({ progress }: { progress: number }) => {
    if (progress >= 0 && progress <= 1) {
      onProgress?.({
        stage: 'splitting',
        percent: Math.round(progress * 100),
        message: `Splitting video into parts… ${Math.round(progress * 100)}%`,
      });
    }
  };
  ffmpeg.on('log', onLog);
  ffmpeg.on('progress', onFfProgress);

  const inDir = '/in';
  const outDir = '/out';
  const { ext, mime, muxerOptions } = outputFormat(file);
  const baseName = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9-]+/g, '_').slice(0, 60) || 'video';

  const cleanupOutputs = async () => {
    try {
      const entries = await ffmpeg.listDir(outDir);
      for (const e of entries) {
        if (!e.isDir) await ffmpeg.deleteFile(`${outDir}/${e.name}`).catch(() => {});
      }
    } catch {
      /* directory missing */
    }
  };

  try {
    // Read the file in place (no copy into memory) where supported
    let inputPath: string;
    try {
      await ffmpeg.createDir(inDir).catch(() => {});
      await ffmpeg.mount('WORKERFS' as FFFSType, { files: [file] }, inDir);
      inputPath = `${inDir}/${file.name}`;
    } catch {
      inputPath = `/input.${ext}`;
      await ffmpeg.writeFile(inputPath, new Uint8Array(await file.arrayBuffer()));
    }
    await ffmpeg.createDir(outDir).catch(() => {});

    let duration = options.knownDuration && Number.isFinite(options.knownDuration) ? options.knownDuration : 0;
    if (!duration) {
      logs.length = 0;
      await ffmpeg.exec(['-hide_banner', '-i', inputPath]); // prints stream info, exits non-zero by design
      duration = parseDurationFromLog(logs);
    }
    if (!duration) throw new Error('Could not read the video length. Please export the video as MP4 (H.264) and try again.');

    let segmentSeconds = Math.max(10, (duration * TARGET_PART_BYTES) / file.size);

    for (let attempt = 1; attempt <= 4; attempt++) {
      if (signal?.aborted) throw abortError();
      await cleanupOutputs();
      logs.length = 0;
      onProgress?.({ stage: 'splitting', percent: 0, message: 'Splitting video into parts…' });

      const code = await ffmpeg.exec([
        '-hide_banner',
        '-i', inputPath,
        '-map', '0:v:0',
        '-map', '0:a?',
        '-sn', '-dn',
        '-c', 'copy',
        '-f', 'segment',
        '-segment_time', segmentSeconds.toFixed(2),
        '-reset_timestamps', '1',
        '-segment_list', `${outDir}/parts.csv`,
        '-segment_list_type', 'csv',
        ...muxerOptions,
        `${outDir}/part_%03d.${ext}`,
      ]);
      if (signal?.aborted) throw abortError();
      if (code !== 0) {
        const tail = logs.slice(-6).join(' ').slice(-400);
        throw new Error(
          `The video could not be split (ffmpeg exit ${code}). Please export it as MP4 (H.264/AAC) and try again. ${tail}`
        );
      }

      const csv = new TextDecoder().decode((await ffmpeg.readFile(`${outDir}/parts.csv`)) as Uint8Array);
      const listed = csv
        .split(/\r?\n/)
        .map((l) => l.split(','))
        .filter((c) => c.length >= 3 && c[0])
        .map(([name, start, end]) => ({ name: name.replace(/^.*\//, ''), start: Number(start), end: Number(end) }));
      if (listed.length === 0) throw new Error('The video could not be split: no parts were produced.');

      const parts: SplitVideoPart[] = [];
      let tooBig = 0;
      for (let i = 0; i < listed.length; i++) {
        if (signal?.aborted) throw abortError();
        const item = listed[i];
        onProgress?.({
          stage: 'reading',
          percent: Math.round((i / listed.length) * 100),
          message: `Preparing part ${i + 1} of ${listed.length}…`,
        });
        const data = (await ffmpeg.readFile(`${outDir}/${item.name}`)) as Uint8Array;
        await ffmpeg.deleteFile(`${outDir}/${item.name}`).catch(() => {});
        if (data.byteLength > MAX_PART_BYTES) tooBig = Math.max(tooBig, data.byteLength);
        if (tooBig) continue; // will retry with shorter parts; drop data now to save memory
        const partNo = String(i + 1).padStart(2, '0');
        parts.push({
          file: new File([data as BlobPart], `${baseName}_part${partNo}.${ext}`, { type: mime }),
          start: item.start,
          duration: Math.max(0, item.end - item.start),
        });
      }

      if (!tooBig) {
        // Normalise starts so playback offsets add up exactly
        let offset = 0;
        for (const p of parts) {
          p.start = offset;
          offset += p.duration;
        }
        return parts;
      }

      // Some part was over the limit (bitrate spike): retry with proportionally shorter parts
      segmentSeconds = Math.max(4, segmentSeconds * (TARGET_PART_BYTES / tooBig) * 0.9);
    }

    throw new Error(
      'This video has very high bitrate scenes and could not be split into parts under 50 MB. Please compress it (e.g. 720p) and try again.'
    );
  } finally {
    signal?.removeEventListener('abort', onAbort);
    if (ffmpegInstance) {
      ffmpeg.off('log', onLog);
      ffmpeg.off('progress', onFfProgress);
      await cleanupOutputs();
      await ffmpeg.deleteFile('/out/parts.csv').catch(() => {});
      await ffmpeg.unmount(inDir).catch(() => {});
      await ffmpeg.deleteFile(`/input.${ext}`).catch(() => {});
    }
  }
}
