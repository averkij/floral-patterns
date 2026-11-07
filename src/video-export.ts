import { BufferTarget, CanvasSource, Mp4OutputFormat, Output, Quality, WebMOutputFormat, canEncodeVideo } from 'mediabunny';
import { createGrowthRenderer } from './growth-renderer';
import type { PageTimeline } from './engines/page-types';

export const VIDEO_WIDTH = 764, VIDEO_HEIGHT = 1080, VIDEO_FPS = 30;
const quality = new Quality({ bitrate: 4_000_000 });
export type VideoFormat = { extension: 'mp4' | 'webm'; codec: 'avc' | 'vp9' | 'vp8'; mime: string };
export async function findVideoFormat(): Promise<VideoFormat | null> {
  const options = { width: VIDEO_WIDTH, height: VIDEO_HEIGHT, frameRate: VIDEO_FPS, quality };
  for (const codec of ['avc', 'vp9', 'vp8'] as const) {
    if (await canEncodeVideo(codec, options)) return codec === 'avc'
      ? { extension: 'mp4', codec, mime: 'video/mp4' }
      : { extension: 'webm', codec, mime: 'video/webm' };
  }
  return null;
}

/** Fixed timestamps avoid dropped frames; only one encoded frame is queued at a time. */
export async function exportGardenVideo(timeline: PageTimeline, format: VideoFormat,
  signal: AbortSignal, progress: (percent: number, stage: string) => void): Promise<Blob> {
  signal.throwIfAborted();
  const drawing = document.createElement('canvas');
  const canvas = document.createElement('canvas');
  canvas.width = VIDEO_WIDTH; canvas.height = VIDEO_HEIGHT;
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) throw new Error('Не удалось подготовить холст для видео.');
  let renderer: Awaited<ReturnType<typeof createGrowthRenderer>> | undefined;
  const target = new BufferTarget();
  const output = new Output({ target, format: format.extension === 'mp4' ? new Mp4OutputFormat({ fastStart: 'in-memory' }) : new WebMOutputFormat() });
  let finalized = false;
  // Cancelling also releases an encoder that is waiting for backpressure.
  let cancelling: Promise<void> | undefined;
  const cancel = () => { cancelling ??= output.cancel(); void cancelling.catch(() => {}); };
  signal.addEventListener('abort', cancel, { once: true });
  try {
    progress(0, 'Подготавливаем кадры');
    renderer = await createGrowthRenderer(timeline, drawing, { width: VIDEO_WIDTH, includeText: true, signal,
      onProgress: fraction => progress(Math.floor(fraction * 10), 'Подготавливаем кадры') });
    signal.throwIfAborted();
    const source = new CanvasSource(canvas, { codec: format.codec, quality, keyFrameInterval: 2 });
    output.addVideoTrack(source, { frameRate: VIDEO_FPS });
    await output.start();
    const frames = Math.ceil((renderer.duration + 2) * VIDEO_FPS);
    for (let i = 0; i < frames; i++) {
      signal.throwIfAborted();
      renderer.renderFrame(i / VIDEO_FPS);
      context.drawImage(drawing, 0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);
      await source.add(i / VIDEO_FPS, 1 / VIDEO_FPS);
      progress(10 + Math.floor((i + 1) / frames * 88), `Создаём ${format.extension.toUpperCase()}`);
      // Yield to input/paint so cancellation stays responsive during software encoding.
      if (i % 4 === 0) await new Promise(resolve => setTimeout(resolve, 0));
    }
    signal.throwIfAborted();
    source.close();
    progress(99, 'Сохраняем видео');
    await output.finalize();
    signal.throwIfAborted();
    finalized = true;
    if (!target.buffer) throw new Error('Не удалось сохранить видео.');
    return new Blob([target.buffer], { type: format.mime });
  } finally {
    signal.removeEventListener('abort', cancel);
    if (!finalized) { cancel(); await cancelling?.catch(() => {}); }
    renderer?.dispose();
    drawing.width = drawing.height = canvas.width = canvas.height = 1;
  }
}
