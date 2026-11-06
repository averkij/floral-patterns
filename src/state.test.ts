import { afterEach, expect, test, vi } from 'vitest';
import { constrainRect, initialState, loadState, sanitizeState, serializeState } from './state';
import { validatePageSettings } from './engines/page-adapter';

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
