import { useCallback, useEffect, useRef, useState } from 'react';
import { createPageEngine, type PageResult, type PageTimeline } from './engines/page-engine';
import { generationError } from './i18n';
import type { StudioState } from './state';

export type Generated = { svg: string; outline: string; detail: string; key: string };
const empty: Generated = { svg: '', outline: '', detail: '', key: '' };
export function useGeneration(state: StudioState, paused: boolean, watchGrowth = true) {
  const [outputs, setOutputs] = useState({ page: empty, shape: empty });
  const [request, setRequest] = useState<{ key: string; tab: StudioState['tab']; animate: boolean } | null>(null);
  const consumed = useRef<typeof request>(null);
  const cachedPage = useRef<{ key: string; result: PageResult } | null>(null);
  const [playback, setPlayback] = useState<{ timeline: PageTimeline; request: typeof request } | null>(null);
  const [busy, setBusy] = useState(false),
    [status, setStatus] = useState(''),
    [error, setError] = useState('');
  const { showFrame: _frame, ...pageInput } = state.page;
  const { showOutline: _outline, ...shapeInput } = state.shape;
  const key = JSON.stringify(state.tab === 'page' ? pageInput : shapeInput),
    tab = state.tab;
  useEffect(() => {
    let active = true,
      worker: Worker | undefined,
      engine: ReturnType<typeof createPageEngine> | undefined,
      timeout: ReturnType<typeof setTimeout> | undefined;
    setError('');
    if (!request || request === consumed.current || request.key !== key || request.tab !== tab || paused) {
      consumed.current = request;
      setBusy(false);
      setStatus('');
      setPlayback(null);
      return;
    }
    consumed.current = request;
    if (tab === 'shape' && state.shape.kind === 'custom' && state.shape.points.length < 3) {
      setBusy(false);
      setStatus('Сначала нарисуйте контур.');
      return;
    }
    setBusy(true);
    setPlayback(null);
    setStatus(tab === 'page' ? 'Подготавливаем сад…' : 'Размещаем цветы…');
    const complete = (result: Omit<Generated, 'key'>) => {
      if (!active) return;
      if (timeout) clearTimeout(timeout);
      const generated = { ...result, key };
      setOutputs((previous) => ({ ...previous, [tab]: generated }));
      setBusy(false);
      setStatus('');
    };
    const fail = (cause: unknown) => {
      if (!active || (cause instanceof DOMException && cause.name === 'AbortError')) return;
      if (timeout) clearTimeout(timeout);
      setBusy(false);
      setStatus('');
      setError(generationError(cause));
    };
    const presentPage = (result: PageResult) => {
      if (!active) return;
      const generated = { svg: result.svg, outline: '', detail: 'Цветочник А4 · Florilegium', key };
      setOutputs(previous => ({ ...previous, page: generated }));
      if (request.animate && result.timeline) {
        setPlayback({ timeline: result.timeline, request });
        setStatus('Выращиваем сад…');
      } else {
        setBusy(false);
        setStatus('');
      }
    };
    const timer = setTimeout(async () => {
      try {
        if (tab === 'page') {
          const cached = cachedPage.current;
          if (cached?.key === key && (!request.animate || cached.result.timeline)) {
            presentPage(cached.result);
            return;
          }
          engine = createPageEngine();
          const result = await engine.generate(
            { version: 1, ...JSON.parse(key) },
            (progress) => {
              if (active) setStatus(progress.stage === 'loading' ? 'Загружаем генератор…' : 'Создаём узор…');
            },
            request.animate,
          );
          engine.dispose();
          if (!active) return;
          cachedPage.current = { key, result };
          presentPage(result);
        } else {
          const { createShapeMask } = await import('./engines/shape-mask');
          await document.fonts.load('400 100px "Floralia Serif"');
          await document.fonts.ready;
          if (!active) return;
          const settings: StudioState['shape'] = JSON.parse(key);
          if (!settings.text.trim() && settings.kind === 'text')
            throw new Error('Type a letter or a short word to fill.');
          const mask = createShapeMask({
            width: 800,
            height: 800,
            kind: settings.kind,
            text: settings.text,
            fontFamily: settings.font === 'serif' ? '"Floralia Serif", Georgia, serif' : 'Arial',
            points: settings.points,
          });
          worker = new Worker(new URL('./engines/shape-worker.ts', import.meta.url), {
            type: 'module',
          });
          timeout = setTimeout(() => {
            worker?.terminate();
            fail(new Error('This region took too long. Try a lower density.'));
          }, 30000);
          worker.onmessage = ({ data }) => {
            if (data.error) fail(new Error(data.error));
            else
              complete({
                svg: data.result.svg,
                outline: mask.path,
                detail: `${data.result.stats.cells} ячеек · ${data.result.stats.flowers} цветов`,
              });
            worker?.terminate();
          };
          worker.onerror = (event) => {
            fail(new Error(event.message || 'The shape worker could not start.'));
            worker?.terminate();
          };
          worker.onmessageerror = () => {
            fail(new Error('The shape result could not be read. Try another seed.'));
            worker?.terminate();
          };
          worker.postMessage({
            width: 800,
            height: 800,
            seed: settings.seed,
            density: settings.density,
            flowerScale: settings.flowerScale,
            palette: { ink: settings.ink, accent: settings.accent, paper: settings.paper },
            mask,
            showCells: settings.showCells,
          });
        }
      } catch (cause) {
        fail(cause);
      }
    }, 50);
    return () => {
      active = false;
      clearTimeout(timer);
      if (timeout) clearTimeout(timeout);
      worker?.terminate();
      engine?.dispose();
    };
    // The serialized inputs deliberately exclude guide-only controls.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, tab, paused, request]);
  const finishPlayback = useCallback(() => {
    if (!playback || playback.request !== consumed.current) return;
    setPlayback(null);
    setBusy(false);
    setStatus('');
  }, [playback]);
  const playbackProgress = useCallback((percent: number) => {
    setStatus(`Выращиваем сад · ${percent}%`);
  }, []);
  useEffect(() => {
    if (!watchGrowth && playback) finishPlayback();
  }, [watchGrowth, playback, finishPlayback]);
  return {
    output: outputs[tab],
    busy,
    status: status || (outputs[tab].key !== key ? 'Нажмите «Создать узор», чтобы применить настройки.' : ''),
    error,
    current: outputs[tab].key === key,
    timeline: tab === 'page' && playback?.request?.key === key ? playback.timeline : null,
    finishPlayback,
    playbackProgress,
    generate: () => setRequest({ key, tab, animate: watchGrowth }),
    replay: () => setRequest({ key, tab, animate: watchGrowth }),
  };
}
