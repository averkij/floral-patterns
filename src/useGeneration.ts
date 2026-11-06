import { useEffect, useRef, useState } from 'react';
import { createPageEngine } from './engines/page-engine';
import type { StudioState } from './state';

export type Generated = { svg: string; outline: string; detail: string; key: string };
const empty: Generated = { svg: '', outline: '', detail: '', key: '' };
export function useGeneration(state: StudioState, paused: boolean) {
  const [outputs, setOutputs] = useState({ page: empty, shape: empty });
  const [busy, setBusy] = useState(false),
    [status, setStatus] = useState(''),
    [error, setError] = useState('');
  const cache = useRef({ page: empty, shape: empty });
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
    if (paused) {
      setBusy(false);
      setStatus('');
      return;
    }
    if (cache.current[tab].key === key) {
      setBusy(false);
      setStatus('');
      return;
    }
    if (tab === 'shape' && state.shape.kind === 'custom' && state.shape.points.length < 3) {
      setBusy(false);
      setStatus('Draw an outline to begin.');
      return;
    }
    setBusy(true);
    setStatus(tab === 'page' ? 'Preparing the garden…' : 'Finding room for flowers…');
    const complete = (result: Omit<Generated, 'key'>) => {
      if (!active) return;
      if (timeout) clearTimeout(timeout);
      const generated = { ...result, key };
      cache.current[tab] = generated;
      setOutputs((previous) => ({ ...previous, [tab]: generated }));
      setBusy(false);
      setStatus('');
    };
    const fail = (cause: unknown) => {
      if (!active || (cause instanceof DOMException && cause.name === 'AbortError')) return;
      if (timeout) clearTimeout(timeout);
      setBusy(false);
      setStatus('');
      setError(cause instanceof Error ? cause.message : String(cause));
    };
    const timer = setTimeout(async () => {
      try {
        if (tab === 'page') {
          engine = createPageEngine();
          const result = await engine.generate({ version: 1, ...JSON.parse(key) }, (progress) => {
            if (active) setStatus(progress.label);
          });
          complete({ svg: result.svg, outline: '', detail: 'Four margins · Florilegium' });
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
            fontFamily: settings.font === 'serif' ? 'Floralia Serif' : 'Arial',
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
                detail: `${data.result.stats.cells} cells · ${data.result.stats.flowers} flowers`,
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
    }, 350);
    return () => {
      active = false;
      clearTimeout(timer);
      if (timeout) clearTimeout(timeout);
      worker?.terminate();
      engine?.dispose();
    };
    // The serialized inputs deliberately exclude guide-only controls.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, tab, paused]);
  return { output: outputs[tab], busy, status, error, current: outputs[tab].key === key };
}
