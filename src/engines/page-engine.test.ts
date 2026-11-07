import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { createPageEngine, FLORILEGIUM_REVISION, PAGE_ADAPTER } from './page-engine';
import type { PageRequest, PageResponse, PageResult, PageSettings } from './page-types';

class WorkerDouble {
  static instances: WorkerDouble[] = [];
  requests: PageRequest[] = [];
  terminated = false;
  onmessage: ((message: MessageEvent<PageResponse>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessageerror: (() => void) | null = null;
  constructor() {
    WorkerDouble.instances.push(this);
  }
  postMessage(request: PageRequest) {
    this.requests.push(request);
  }
  terminate() {
    this.terminated = true;
  }
  respond(message: PageResponse) {
    this.onmessage?.({ data: message } as MessageEvent<PageResponse>);
  }
}

const settings: PageSettings = {
  version: 1,
  seed: 7,
  rect: { x: 56, y: 52, width: 108, height: 189 },
  ink: '#234533',
  accent: '#a54f44',
  paper: '#fffdf8',
  density: 0.55,
  season: 'summer',
  visitors: ['bee'],
};
const result: PageResult = {
  svg: '<svg/>',
  ms: 100,
  stats: { motifs: 5, stems: 40, visitors: [] },
  revision: FLORILEGIUM_REVISION,
  adapter: PAGE_ADAPTER,
};

beforeEach(() => {
  WorkerDouble.instances = [];
  vi.stubGlobal('Worker', WorkerDouble);
  vi.stubGlobal('window', { location: { href: 'https://example.test/floral-patterns/' } });
  vi.stubEnv('BASE_URL', '/floral-patterns/');
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

test('new generation terminates obsolete work and ignores stale results, with subpath-safe runtime URLs', async () => {
  const engine = createPageEngine();
  const first = engine.generate(settings).catch((error: Error) => error);
  const obsolete = WorkerDouble.instances[0];
  const second = engine.generate({ ...settings, seed: 8 });
  const active = WorkerDouble.instances[1];
  expect(obsolete.terminated).toBe(true);
  expect(((await first) as Error).name).toBe('AbortError');
  obsolete.respond({ id: 1, result: { ...result, svg: '<wrong/>' } });
  active.respond({ id: 2, result });
  expect(await second).toBe(result);
  expect(active.requests[0].runtime).toEqual({
    wasm: 'https://example.test/floral-patterns/vendor/wasmoon/glue.wasm',
    lua: 'https://example.test/floral-patterns/vendor/florilegium/',
    fonts: 'https://example.test/floral-patterns/fonts/',
  });
  engine.dispose();
  expect(active.terminated).toBe(true);
  await expect(engine.generate(settings)).rejects.toThrow(/disposed/);
});

test('a stalled worker is terminated and the next request can start cleanly', async () => {
  vi.useFakeTimers();
  const engine = createPageEngine();
  const stalled = engine.generate(settings).catch((error: Error) => error);
  await vi.advanceTimersByTimeAsync(120_000);
  expect(((await stalled) as Error).message).toMatch(/too long/);
  expect(WorkerDouble.instances[0].terminated).toBe(true);
  const recovered = engine.generate(settings);
  WorkerDouble.instances[1].respond({ id: 2, result });
  expect(await recovered).toBe(result);
  engine.dispose();
});

test('compact timeline requests are cancellable and static requests omit animation', async () => {
  const engine = createPageEngine();
  const onProgress = vi.fn();
  const generation = engine.generate(settings, onProgress, true).catch((error: Error) => error);
  const worker = WorkerDouble.instances[0];
  expect(worker.requests[0].animate).toBe(true);
  const progress = { stage: 'growing' as const, completed: 0, total: 1, label: 'Composing one continuous garden' };
  worker.respond({ id: 1, progress });
  expect(onProgress).toHaveBeenCalledExactlyOnceWith(progress);
  engine.cancel();
  expect((await generation as Error).name).toBe('AbortError');
  worker.respond({ id: 1, result: { ...result, timeline: { svg: '<svg/>', duration: 12, events: [] } } });
  worker.respond({ id: 1, progress });
  expect(onProgress).toHaveBeenCalledTimes(1);
  const staticGeneration = engine.generate(settings);
  const staticWorker = WorkerDouble.instances[1];
  expect(staticWorker.requests[0].animate).toBe(false);
  staticWorker.respond({ id: 2, result });
  expect(await staticGeneration).toBe(result);
  engine.dispose();
});
