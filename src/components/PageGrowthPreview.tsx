import { memo, useLayoutEffect, useRef } from 'react';
import type { PageTimeline } from '../engines/page-types';
import { createGrowthRenderer } from '../growth-renderer';

/** Live playback and video export use the same timestamp-driven drawing code. */
export default memo(function PageGrowthPreview({ timeline, onComplete, onProgress }: {
  timeline: PageTimeline; onComplete: () => void; onProgress: (percent: number) => void;
}) {
  const surface = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const controller = new AbortController();
    let frame = 0, renderer: Awaited<ReturnType<typeof createGrowthRenderer>> | undefined;
    canvas.dataset.phase = 'preparing';
    canvas.dataset.growthFrame = '0';
    onProgress(0);
    const cssWidth = surface.current?.getBoundingClientRect().width ?? 600;
    const width = Math.round(Math.max(600, Math.min(1200, cssWidth * Math.min(2, devicePixelRatio || 1))));
    async function prepare() {
      try {
        const prepared = await createGrowthRenderer(timeline, canvas!, { width, signal: controller.signal });
        if (controller.signal.aborted) { prepared.dispose(); return; }
        renderer = prepared;
        canvas!.dataset.phase = 'playing';
        let start: number | undefined, lastPercent = -1, rendered = 0;
        const tick = (now: number) => {
          if (controller.signal.aborted) return;
          start ??= now;
          const seconds = (now - start) / 1000;
          prepared.renderFrame(seconds);
          canvas!.dataset.growthFrame = String(++rendered);
          const percent = Math.floor(Math.min(1, seconds / prepared.duration) * 100);
          if (percent !== lastPercent) { onProgress(percent); lastPercent = percent; }
          if (seconds < prepared.duration) frame = requestAnimationFrame(tick);
          else { canvas!.dataset.phase = 'complete'; onComplete(); }
        };
        frame = requestAnimationFrame(tick);
      } catch (error) {
        if (!controller.signal.aborted) {
          canvas!.dataset.phase = 'fallback';
          console.warn('Growth playback could not prepare; displaying the completed vector garden.', error);
          onComplete();
        }
      }
    }
    frame = requestAnimationFrame(() => { void prepare(); });
    return () => {
      controller.abort();
      cancelAnimationFrame(frame);
      renderer?.dispose();
    };
  }, [timeline, onComplete, onProgress]);
  return <div className="growth-preview" ref={surface} role="img" aria-label="Цветочный сад растёт вокруг области текста">
    <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
  </div>;
});
