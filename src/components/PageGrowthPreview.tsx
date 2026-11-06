import { memo, useLayoutEffect, useRef } from 'react';
import type { PageGrowthEvent, PageTimeline } from '../engines/page-engine';

const SVG_NS = 'http://www.w3.org/2000/svg';
const XML = new XMLSerializer();

interface Fragment {
  element?: SVGGraphicsElement;
  event?: PageGrowthEvent;
  x: number;
  y: number;
  width: number;
  height: number;
  bitmap?: HTMLCanvasElement;
  scratch?: HTMLCanvasElement;
  path?: Path2D;
  length?: number;
}

function releaseCanvas(canvas?: HTMLCanvasElement) {
  if (canvas) canvas.width = canvas.height = 1;
}

/** Decode only a bounded fragment, then discard both its SVG URL and image. */
async function rasterize(source: string, width: number, height: number, signal: AbortSignal) {
  const url = URL.createObjectURL(new Blob([source], { type: 'image/svg+xml' }));
  const image = new Image();
  let cancel: (() => void) | undefined;
  try {
    await new Promise<void>((resolve, reject) => {
      cancel = () => reject(new DOMException('Growth preview cancelled.', 'AbortError'));
      signal.addEventListener('abort', cancel, { once: true });
      if (signal.aborted) { cancel(); return; }
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('A botanical preview fragment could not be decoded.'));
      image.src = url;
    });
    if (signal.aborted) throw new DOMException('Growth preview cancelled.', 'AbortError');
    const bitmap = document.createElement('canvas');
    bitmap.width = width;
    bitmap.height = height;
    const context = bitmap.getContext('2d');
    if (!context) throw new Error('Canvas is unavailable.');
    context.drawImage(image, 0, 0, width, height);
    return bitmap;
  } finally {
    if (cancel) signal.removeEventListener('abort', cancel);
    image.onload = image.onerror = null;
    image.removeAttribute('src');
    URL.revokeObjectURL(url);
  }
}

/** One compact native event schedule; bounded raster caches keep playback cheap. */
export default memo(function PageGrowthPreview({ timeline, onComplete, onProgress }: {
  timeline: PageTimeline;
  onComplete: () => void;
  onProgress: (percent: number) => void;
}) {
  const surface = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d', { alpha: false });
    if (!canvas || !context) { onComplete(); return; }
    const controller = new AbortController();
    const fragments: Fragment[] = [];
    const holder = document.createElement('div');
    let frame = 0;
    let cancelled = false;
    let pixelScale = 1;
    let pageWidth = 595.2755905511812;
    let pageHeight = 841.8897637795276;
    let reservation: Path2D | undefined;
    let paper = timeline.svg.match(/<rect\b[^>]*\bfill="(#[\da-f]{6})"/i)?.[1] ?? '#fffdf8';
    const cssWidth = surface.current?.getBoundingClientRect().width ?? 600;
    const pixels = Math.round(Math.max(600, Math.min(1200, cssWidth * Math.min(2, devicePixelRatio || 1))));
    canvas.width = pixels;
    canvas.height = Math.round(pixels * pageHeight / pageWidth);
    context.fillStyle = paper;
    context.fillRect(0, 0, canvas.width, canvas.height);
    canvas.dataset.phase = 'preparing';
    canvas.dataset.growthFrame = '0';
    onProgress(0);

    function disposeFragments() {
      for (const fragment of fragments) {
        releaseCanvas(fragment.bitmap);
        releaseCanvas(fragment.scratch);
        fragment.bitmap = fragment.scratch = undefined;
      }
      fragments.length = 0;
    }

    function drawStem(fragment: Fragment, progress: number) {
      if (!fragment.bitmap || !fragment.path) return;
      fragment.scratch ??= document.createElement('canvas');
      const scratch = fragment.scratch;
      if (scratch.width !== fragment.bitmap.width || scratch.height !== fragment.bitmap.height) {
        scratch.width = fragment.bitmap.width;
        scratch.height = fragment.bitmap.height;
      }
      const mask = scratch.getContext('2d')!;
      mask.setTransform(1, 0, 0, 1, 0, 0);
      mask.globalCompositeOperation = 'source-over';
      mask.clearRect(0, 0, scratch.width, scratch.height);
      mask.drawImage(fragment.bitmap, 0, 0);
      mask.globalCompositeOperation = 'destination-in';
      // Native paths are y-up PDF points; the fragment bitmap is y-down pixels.
      mask.setTransform(pixelScale, 0, 0, -pixelScale,
        -fragment.x * pixelScale, (pageHeight - fragment.y) * pixelScale);
      mask.lineCap = mask.lineJoin = 'round';
      mask.lineWidth = Math.max(2, (fragment.event?.width ?? 1) + 2);
      mask.strokeStyle = '#fff';
      const length = fragment.length ?? 1;
      mask.setLineDash([Math.max(0.001, length * progress), length + 1]);
      mask.stroke(fragment.path);
      context!.drawImage(scratch, fragment.x * pixelScale, fragment.y * pixelScale);
    }

    function play() {
      if (cancelled) return;
      canvas!.dataset.phase = 'playing';
      const duration = Math.max(0.01, timeline.duration);
      const playbackMs = Math.max(10, Math.min(24, duration)) * 1000;
      let start = 0;
      let lastPercent = -1;
      let rendered = 0;
      const tick = (now: number) => {
        if (cancelled) return;
        start ||= now;
        const fraction = Math.min(1, (now - start) / playbackMs);
        const time = fraction * duration;
        context!.setTransform(1, 0, 0, 1, 0, 0);
        context!.fillStyle = paper;
        context!.fillRect(0, 0, canvas!.width, canvas!.height);
        context!.save();
        if (reservation) {
          context!.setTransform(pixelScale, 0, 0, -pixelScale, 0, pageHeight * pixelScale);
          context!.clip(reservation, 'evenodd');
          context!.setTransform(1, 0, 0, 1, 0, 0);
        }
        for (const fragment of fragments) {
          if (!fragment.bitmap) continue;
          const event = fragment.event;
          if (event && time < event.start && fraction < 1) continue;
          const progress = event && fraction < 1
            ? Math.min(1, Math.max(0, (time - event.start) / Math.max(0.001, event.duration))) : 1;
          if (progress <= 0) continue;
          if (progress >= 1) {
            context!.drawImage(fragment.bitmap, fragment.x * pixelScale, fragment.y * pixelScale);
            if (fragment.scratch) { releaseCanvas(fragment.scratch); fragment.scratch = undefined; }
          } else if (event?.kind === 'stem' && fragment.path) {
            drawStem(fragment, progress);
          } else if (event) {
            const scale = Math.max(0.001, progress * progress * (3 - 2 * progress));
            const px = event.x * pixelScale, py = (pageHeight - event.y) * pixelScale;
            context!.save();
            context!.translate(px, py);
            context!.scale(scale, scale);
            context!.drawImage(fragment.bitmap, fragment.x * pixelScale - px, fragment.y * pixelScale - py);
            context!.restore();
          }
        }
        context!.restore();
        // QA can count real drawn frames without subscribing React to animation.
        canvas!.dataset.growthFrame = String(++rendered);
        const percent = Math.floor(fraction * 100);
        if (percent !== lastPercent) { onProgress(percent); lastPercent = percent; }
        if (fraction < 1) frame = requestAnimationFrame(tick);
        else {
          canvas!.dataset.phase = 'complete';
          disposeFragments();
          onComplete();
        }
      };
      frame = requestAnimationFrame(tick);
    }

    async function prepare() {
      const preparingAt = performance.now();
      try {
        if (cancelled) return;
        holder.style.cssText = 'position:fixed;left:-10000px;top:0;visibility:hidden;pointer-events:none;contain:layout style paint;';
        // Only local generator output is parsed; input metadata is XML-escaped.
        holder.innerHTML = timeline.svg;
        document.body.append(holder);
        const svg = holder.querySelector('svg')!;
        const box = svg.viewBox.baseVal;
        pageWidth = box.width;
        pageHeight = box.height;
        pixelScale = pixels / pageWidth;
        canvas!.height = Math.ceil(pageHeight * pixelScale);
        const scene = svg.querySelector<SVGGElement>(':scope > g');
        if (!scene) throw new Error('The garden preview is missing its scene.');
        const definitions = svg.querySelector(':scope > defs');
        const exclusion = definitions?.querySelector('#garden-reservation path')?.getAttribute('d');
        if (exclusion) reservation = new Path2D(exclusion);
        paper = svg.querySelector(':scope > rect')?.getAttribute('fill') ?? paper;
        context!.fillStyle = paper;
        context!.fillRect(0, 0, canvas!.width, canvas!.height);
        const events = new Map(timeline.events.map(event => [event.id, event]));
        for (const element of Array.from(scene.children)) {
          if (!(element instanceof SVGGraphicsElement)) continue;
          const bounds = element.getBBox();
          // Include antialiasing and small strokes, then bound all caches to paper.
          const left = Math.max(0, bounds.x - 3), right = Math.min(pageWidth, bounds.x + bounds.width + 3);
          const top = Math.max(0, pageHeight - bounds.y - bounds.height - 3);
          const bottom = Math.min(pageHeight, pageHeight - bounds.y + 3);
          if (right <= left || bottom <= top) continue;
          const event = events.get((element as SVGElement).dataset.growthEvent ?? '');
          const fragment: Fragment = { element, event, x: left, y: top, width: right - left, height: bottom - top };
          if (event?.kind === 'stem' && event.path) {
            fragment.path = new Path2D(event.path);
            const measure = document.createElementNS(SVG_NS, 'path');
            measure.setAttribute('d', event.path);
            fragment.length = measure.getTotalLength();
          }
          fragments.push(fragment);
        }
        // A very intricate genome can contain large internal wash rectangles.
        // Bound aggregate RGBA cache memory as well as each individual image.
        const area = fragments.reduce((sum, fragment) => sum + fragment.width * fragment.height, 0);
        pixelScale = Math.min(pixelScale, Math.sqrt(24_000_000 / Math.max(1, area)));
        canvas!.width = Math.ceil(pageWidth * pixelScale);
        canvas!.height = Math.ceil(pageHeight * pixelScale);
        context!.fillStyle = paper;
        context!.fillRect(0, 0, canvas!.width, canvas!.height);
        let next = 0;
        async function loadFragments() {
          while (!cancelled && next < fragments.length) {
            const fragment = fragments[next++];
            const width = Math.max(1, Math.ceil(fragment.width * pixelScale));
            const height = Math.max(1, Math.ceil(fragment.height * pixelScale));
            // Align the crop to pixel scale so masks and bitmaps share one map.
            const sample = svg.cloneNode(false) as SVGSVGElement;
            sample.setAttribute('width', String(width));
            sample.setAttribute('height', String(height));
            sample.setAttribute('viewBox', `${fragment.x} ${fragment.y} ${width / pixelScale} ${height / pixelScale}`);
            if (definitions) sample.append(definitions.cloneNode(true));
            const group = scene!.cloneNode(false) as SVGGElement;
            group.append(fragment.element!.cloneNode(true));
            sample.append(group);
            const bitmap = await rasterize(XML.serializeToString(sample), width, height, controller.signal);
            if (cancelled) { releaseCanvas(bitmap); return; }
            fragment.bitmap = bitmap;
          }
        }
        await Promise.all([loadFragments(), loadFragments()]);
        // Do not retain the large SVG DOM or source fragments throughout playback.
        holder.replaceChildren();
        holder.remove();
        for (const fragment of fragments) fragment.element = undefined;
        canvas!.dataset.fragments = String(fragments.length);
        canvas!.dataset.rasterPixels = String(fragments.reduce((sum, fragment) => sum + fragment.bitmap!.width * fragment.bitmap!.height, 0));
        canvas!.dataset.prepareMs = String(Math.round(performance.now() - preparingAt));
        play();
      } catch (error) {
        holder.remove();
        controller.abort();
        disposeFragments();
        if (!cancelled) {
          canvas!.dataset.phase = 'fallback';
          console.warn('Growth playback could not prepare; displaying the completed vector garden.', error);
          onComplete();
        }
      }
    }
    frame = requestAnimationFrame(() => { void prepare(); });
    return () => {
      cancelled = true;
      controller.abort();
      cancelAnimationFrame(frame);
      holder.remove();
      holder.replaceChildren();
      disposeFragments();
      releaseCanvas(canvas);
    };
  }, [timeline, onComplete, onProgress]);

  return <div className="growth-preview" ref={surface} role="img"
    aria-label="A continuous floral garden growing around the reserved rectangle">
    <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
  </div>;
});
