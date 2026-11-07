import { FLOWERS, defaultFlowerColors, isFlower, type Flower, type FlowerColors } from './flowers';
import { normalizePageText } from './page-text';
import { isTextFont, TEXT_SIZES, type TextFont } from './text-fonts';

export type Palette = { ink: string; accent: string; paper: string };
export type Rect = { x: number; y: number; width: number; height: number };
export type Visitor = 'butterfly' | 'bee' | 'bird' | 'snail';
export type PageConfig = Palette & {
  seed: number;
  density: number;
  season: 'spring' | 'summer' | 'autumn';
  rect: Rect;
  visitors: Visitor[];
  flowers: Flower[];
  flowerColors: FlowerColors;
  flowersMatchInk: boolean;
  showFrame: boolean;
  text: string;
  textFont: TextFont;
  textSize: number;
  textColor: string;
};
export type ShapeConfig = Palette & {
  seed: number;
  density: number;
  flowerScale: number;
  kind: 'circle' | 'arch' | 'heart' | 'text' | 'custom';
  text: string;
  font: 'serif' | 'sans';
  points: [number, number][];
  showCells: boolean;
  showOutline: boolean;
};
export type StudioState = {
  version: 1;
  tab: 'page' | 'shape';
  page: PageConfig;
  shape: ShapeConfig;
};

export const initialState: StudioState = {
  version: 1,
  tab: 'page',
  page: {
    seed: 42,
    density: 0.8,
    season: 'summer',
    rect: { x: 56, y: 52, width: 108, height: 189 },
    ink: '#34486a',
    accent: '#b99455',
    paper: '#fffefa',
    visitors: ['butterfly', 'bee', 'bird', 'snail'],
    flowers: FLOWERS.map(f => f.id),
    flowerColors: { ...defaultFlowerColors },
    flowersMatchInk: false,
    showFrame: true,
    text: '',
    textFont: 'serif',
    textSize: 14,
    textColor: '#000000',
  },
  shape: {
    seed: 42,
    density: 190,
    flowerScale: 1,
    kind: 'text',
    text: 'R',
    font: 'serif',
    points: [],
    showCells: false,
    showOutline: false,
    ink: '#626b4d',
    accent: '#d59a8f',
    paper: '#fffefa',
  },
};
export const palettes: { name: string; colors: Palette }[] = [
  { name: 'Делфт', colors: { ink: '#34486a', accent: '#b99455', paper: '#fffefa' } },
  { name: 'Гербарий', colors: { ink: '#626b4d', accent: '#d59a8f', paper: '#fffefa' } },
  { name: 'Шелковица', colors: { ink: '#653e54', accent: '#bf8d75', paper: '#faf5ed' } },
  { name: 'Графит', colors: { ink: '#333a36', accent: '#88958a', paper: '#f5f5ef' } },
];
export const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const number = (value: unknown, fallback: number, min: number, max: number) =>
  typeof value === 'number' && Number.isFinite(value) ? clamp(value, min, max) : fallback;
export function constrainRect(rect: Rect): Rect {
  const defaults = initialState.page.rect;
  const width = number(rect.width, defaults.width, 40, 174),
    height = number(rect.height, defaults.height, 40, 261);
  return {
    x: clamp(number(rect.x, defaults.x, 18, 192), 18, 192 - width),
    y: clamp(number(rect.y, defaults.y, 18, 279), 18, 279 - height),
    width,
    height,
  };
}
const color = (value: unknown, fallback: string) =>
  typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
export function sanitizeState(raw: unknown): StudioState {
  const fallback = structuredClone(initialState);
  if (!raw || typeof raw !== 'object' || (raw as StudioState).version !== 1) return fallback;
  const input = raw as Partial<StudioState>,
    page = input.page,
    shape = input.shape;
  if (input.tab === 'shape') fallback.tab = 'shape';
  if (page && typeof page === 'object') {
    const p = fallback.page;
    p.seed = Math.floor(number(page.seed, 42, 1, 2147483646));
    p.density = number(page.density, p.density, 0.2, 1);
    if (typeof page.text === 'string') p.text = normalizePageText(page.text);
    if (isTextFont(page.textFont)) p.textFont = page.textFont;
    if (TEXT_SIZES.some(size => size === page.textSize)) p.textSize = page.textSize;
    p.textColor = color(page.textColor, p.textColor);
    if (['spring', 'summer', 'autumn'].includes(page.season)) p.season = page.season;
    for (const key of ['ink', 'accent', 'paper'] as const) p[key] = color(page[key], p[key]);
    if (Array.isArray(page.flowers)) {
      const selected = page.flowers.filter(isFlower);
      if (selected.length) p.flowers = FLOWERS.filter(f => selected.includes(f.id)).map(f => f.id);
    }
    if (page.flowerColors && typeof page.flowerColors === 'object') {
      for (const f of FLOWERS) p.flowerColors[f.id] = color(page.flowerColors[f.id], f.color);
    }
    if (typeof page.flowersMatchInk === 'boolean') p.flowersMatchInk = page.flowersMatchInk;
    if (Array.isArray(page.visitors))
      p.visitors = [
        ...new Set(page.visitors.filter((v) => ['butterfly', 'bee', 'bird', 'snail'].includes(v))),
      ];
    if (typeof page.showFrame === 'boolean') p.showFrame = page.showFrame;
    if (page.rect && typeof page.rect === 'object')
      p.rect = constrainRect({
        x: number(page.rect.x, p.rect.x, 18, 192),
        y: number(page.rect.y, p.rect.y, 18, 279),
        width: number(page.rect.width, p.rect.width, 40, 174),
        height: number(page.rect.height, p.rect.height, 40, 261),
      });
  }
  if (shape && typeof shape === 'object') {
    const s = fallback.shape;
    s.seed = Math.floor(number(shape.seed, 42, 1, 2147483646));
    s.density = Math.round(number(shape.density, 190, 60, 260));
    s.flowerScale = number(shape.flowerScale, 1, 0.65, 1.5);
    if (['circle', 'arch', 'heart', 'text', 'custom'].includes(shape.kind)) s.kind = shape.kind;
    if (typeof shape.text === 'string') s.text = [...shape.text].slice(0, 6).join('');
    if (shape.font === 'sans') s.font = 'sans';
    if (typeof shape.showCells === 'boolean') s.showCells = shape.showCells;
    if (typeof shape.showOutline === 'boolean') s.showOutline = shape.showOutline;
    if (Array.isArray(shape.points))
      s.points = shape.points
        .slice(0, 120)
        .filter(
          (p) =>
            Array.isArray(p) &&
            p.length === 2 &&
            p.every((n) => typeof n === 'number' && Number.isFinite(n)),
        )
        .map((p) => [clamp(p[0], 20, 780), clamp(p[1], 20, 780)]);
    for (const key of ['ink', 'accent', 'paper'] as const) s[key] = color(shape[key], s[key]);
  }
  return fallback;
}
export function serializeState(state: StudioState): string {
  return '#studio=' + encodeURIComponent(JSON.stringify(state));
}
export function loadState(): StudioState {
  try {
    if (window.location.hash.startsWith('#studio=')) {
      const shared = JSON.parse(decodeURIComponent(window.location.hash.slice(8)));
      if (shared?.version === 1) return sanitizeState(shared);
    }
  } catch { /* A broken link must not discard the local draft. */ }
  return sanitizeState(readPreferences()?.state);
}

export const STORAGE_KEY = 'flower-power:preferences:v1';
function readPreferences(): { state?: unknown; watchGrowth?: unknown } | null {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null');
    return saved?.version === 1 ? saved : null;
  } catch { return null; }
}
export function loadWatchGrowth(): boolean {
  const saved = readPreferences()?.watchGrowth;
  return typeof saved === 'boolean' ? saved : !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
export function persistSettings(state: StudioState, watchGrowth: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, state, watchGrowth }));
  } catch { /* Editing remains available when browser storage is blocked or full. */ }
  // A shared URL is also a reload source. Keep it aligned with subsequent edits,
  // otherwise the old link silently overwrites the freshly saved local draft.
  if (window.location.hash.startsWith('#studio=')) {
    const hash = serializeState(state);
    if (window.location.hash !== hash) window.history.replaceState(window.history.state, '', hash);
  }
}
