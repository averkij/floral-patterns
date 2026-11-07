import type {
  PageProgress,
  PageRequest,
  PageResponse,
  PageResult,
  PageSettings,
} from './page-types';

export type {
  PageGrowthEvent,
  PageTimeline,
  PageProgress,
  PageRectangle,
  PageResult,
  PageSeason,
  PageSettings,
  PageVisitor,
} from './page-types';
export { FLORILEGIUM_REVISION, PAGE_ADAPTER } from './page-types';

export interface PageEngine {
  generate(
    settings: PageSettings,
    onProgress?: (progress: PageProgress) => void,
    animate?: boolean,
  ): Promise<PageResult>;
  cancel(): void;
  dispose(): void;
}

/** A superseded request terminates its worker: heavy Lua work is actually cancelled. */
export function createPageEngine(): PageEngine {
  let worker: Worker | null = null;
  let sequence = 0;
  let pending: { reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> } | null =
    null;
  let disposed = false;

  function stop() {
    worker?.terminate();
    worker = null;
    if (pending) {
      clearTimeout(pending.timer);
      pending.reject(new DOMException('Generation cancelled.', 'AbortError'));
      pending = null;
    }
  }

  return {
    generate(settings, onProgress, animate = false) {
      if (disposed) return Promise.reject(new Error('This page engine has been disposed.'));
      if (pending) stop();
      worker ??= new Worker(new URL('./page-worker.ts', import.meta.url), { type: 'module' });
      const currentWorker = worker;
      const id = ++sequence;
      const base = new URL(import.meta.env.BASE_URL, window.location.href);
      return new Promise<PageResult>((resolve, reject) => {
        const finish = () => {
          if (pending) clearTimeout(pending.timer);
          pending = null;
        };
        const fail = (error: Error) => {
          if (worker !== currentWorker) return;
          finish();
          currentWorker.terminate();
          if (worker === currentWorker) worker = null;
          reject(error);
        };
        pending = {
          reject,
          timer: setTimeout(
            () =>
              fail(
                new Error('The garden took too long to grow. Try a lower density or another seed.'),
              ),
            120_000,
          ),
        };
        currentWorker.onmessage = ({ data }: MessageEvent<PageResponse>) => {
          if (data.id !== id || worker !== currentWorker) return;
          if ('progress' in data) onProgress?.(data.progress);
          else if ('error' in data) fail(new Error(data.error));
          else {
            finish();
            resolve(data.result);
          }
        };
        currentWorker.onerror = (event) =>
          fail(new Error(event.message || 'The floral worker could not start.'));
        currentWorker.onmessageerror = () =>
          fail(new Error('The floral worker returned an unreadable result.'));
        const request: PageRequest = {
          id,
          settings,
          animate,
          runtime: {
            wasm: new URL('vendor/wasmoon/glue.wasm', base).href,
            lua: new URL('vendor/florilegium/', base).href,
            fonts: new URL('fonts/', base).href,
          },
        };
        currentWorker.postMessage(request);
      });
    },
    cancel: stop,
    dispose() {
      disposed = true;
      stop();
    },
  };
}
