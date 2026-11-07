import { afterEach, expect, test, vi } from 'vitest';
import { constrainRect, initialState, loadState, loadWatchGrowth, persistSettings, sanitizeState, serializeState, STORAGE_KEY } from './state';
import { validatePageSettings } from './engines/page-adapter';
import { defaultFlowerColors } from './flowers';

afterEach(() => vi.unstubAllGlobals());

test.each([
  '',
  '#studio=not-json',
  '#studio=%E0%A4%A',
  '#studio=null',
  '#studio=%7B%22version%22%3A2%7D',
])('malformed or unsupported shared configuration %s restores independent defaults', (hash) => {
  vi.stubGlobal('window', { location: { hash } });
  const state = loadState();
  expect(state).toEqual(initialState);
  state.page.rect.x = 18;
  state.page.visitors.length = 0;
  expect(initialState.page.rect.x).toBe(56);
  expect(initialState.page.visitors).toHaveLength(4);
});

test('untrusted settings cannot create an invalid page rectangle or unsupported density', () => {
  const state = sanitizeState({
    version: 1,
    page: {
      seed: -1,
      density: 1.4,
      season: 'winter',
      ink: 'url(javascript:bad)',
      accent: '#123456',
      rect: { x: 999, y: -999, width: 999, height: 999 },
      visitors: ['bee', null, 'bee', 'unknown', { name: 'bird' }],
    },
    shape: {
      seed: Infinity,
      density: '260',
      flowerScale: NaN,
      points: [[20, 20], [NaN, 5], null, [-9, 999], ['12', 20]],
      text: ['R'],
    },
  });
  expect(state.page.rect).toEqual({ x: 18, y: 18, width: 174, height: 261 });
  expect(state.page.density).toBe(1);
  expect(state.page.seed).toBe(1);
  expect(state.page.season).toBe('summer');
  expect(state.page.ink).toBe(initialState.page.ink);
  expect(state.page.accent).toBe('#123456');
  expect(state.page.visitors).toEqual(['bee']);
  expect(state.shape.points).toEqual([
    [20, 20],
    [20, 780],
  ]);
  expect(state.shape.text).toBe('R');
  expect(() => validatePageSettings({ version: 1, ...state.page })).not.toThrow();
  expect(sanitizeState({ version: 1, page: { density: 0.2 } }).page.density).toBe(0.2);
});

test('rectangle constraints remain valid for all edges, oversized dimensions and non-finite edits', () => {
  const rectangles = [
    { x: -100, y: 999, width: 10, height: 20 },
    { x: 190, y: 270, width: 174, height: 261 },
    { x: NaN, y: Infinity, width: NaN, height: -Infinity },
    { x: 57.125, y: 61.625, width: 82.25, height: 150.125 },
  ];
  for (const rect of rectangles) {
    const constrained = constrainRect(rect);
    expect(() =>
      validatePageSettings({ version: 1, ...initialState.page, rect: constrained }),
    ).not.toThrow();
    expect(constrainRect(constrained)).toEqual(constrained);
  }
});

test('a shared configuration reproduces both demos, including custom outline, Unicode, and low page density', () => {
  const state = structuredClone(initialState);
  state.tab = 'shape';
  state.page.seed = 2147483646;
  state.page.density = 0.25;
  state.page.visitors = [];
  state.page.flowers = ['rose', 'tulip', 'pansy'];
  state.page.flowerColors.rose = '#a14bd2';
  state.page.rect = { x: 57.125, y: 61.625, width: 82.25, height: 150.125 };
  state.page.showFrame = false;
  state.shape.kind = 'custom';
  state.shape.points = [
    [31.125, 40],
    [720, 87.75],
    [520.25, 744],
    [55, 511.875],
  ];
  state.shape.text = 'Ж&🌷';
  state.shape.font = 'sans';
  state.shape.showCells = true;
  state.shape.showOutline = true;
  state.shape.flowerScale = 0.85;
  const hash = serializeState(state);
  vi.stubGlobal('window', { location: { hash } });
  const restored = loadState();
  expect(restored).toEqual(state);
  expect(serializeState(restored)).toBe(hash);
});

test('legacy links gain flower defaults; untrusted selections and colors are sanitized', () => {
  const legacy = sanitizeState({ version: 1, page: { seed: 17 } });
  expect(legacy.page.flowers).toEqual(initialState.page.flowers);
  expect(legacy.page.flowerColors).toEqual(defaultFlowerColors);
  const restored = sanitizeState({ version: 1, page: {
    flowers: ['pansy', 'unknown', null, 'rose', 'rose'],
    flowerColors: { rose: '#123456', pansy: 'red";error(1)' },
  } });
  expect(restored.page.flowers).toEqual(['rose', 'pansy']);
  expect(restored.page.flowerColors).toEqual({ ...defaultFlowerColors, rose: '#123456' });
  expect(sanitizeState({ version: 1, page: { flowers: [] } }).page.flowers).toEqual(initialState.page.flowers);
  restored.page.flowerColors.tulip = '#000000';
  expect(initialState.page.flowerColors.tulip).toBe(defaultFlowerColors.tulip);
});

test('local drafts restore both demos and animation; valid links take priority over cached drafts', () => {
  const stored = new Map<string, string>();
  const location = { hash: '' };
  vi.stubGlobal('window', { location, localStorage: {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => stored.set(key, value),
  }, matchMedia: () => ({ matches: true }) });
  expect(loadState().page.density).toBe(.8);
  expect(loadWatchGrowth()).toBe(false);
  const draft = structuredClone(initialState);
  draft.tab = 'shape';
  draft.page.text = 'Для тебя!\nС любовью 🌷';
  draft.page.visitors = [];
  draft.page.flowerColors.rose = '#112233';
  draft.page.flowersMatchInk = true;
  draft.page.textFont = 'greatvibes';
  draft.page.textSize = 32;
  draft.shape.text = 'Ж';
  persistSettings(draft, true);
  expect(loadState()).toEqual(draft);
  expect(loadWatchGrowth()).toBe(true);
  location.hash = serializeState({ ...draft, tab: 'page', page: { ...draft.page, seed: 79 } });
  expect(loadState().page.seed).toBe(79);
  location.hash = '#studio=broken';
  expect(loadState()).toEqual(draft);
  stored.set(STORAGE_KEY, JSON.stringify({ version: 1, state: { version: 1, page: { density: 99, ink: 'red' } } }));
  expect(loadState().page.density).toBe(1);
  expect(loadState().page.ink).toBe(initialState.page.ink);
  stored.set(STORAGE_KEY, '{broken');
  expect(loadState()).toEqual(initialState);
  stored.set(STORAGE_KEY, JSON.stringify({ version: 2, state: draft }));
  expect(loadState()).toEqual(initialState);
});

test('blocked browser storage does not break editing or shared links', () => {
  vi.stubGlobal('window', { location: { hash: serializeState(initialState) },
    get localStorage() { throw new Error('Storage is blocked'); },
    matchMedia: () => ({ matches: false }),
  });
  expect(loadState()).toEqual(initialState);
  expect(loadWatchGrowth()).toBe(true);
  expect(() => persistSettings(initialState, false)).not.toThrow();
});
