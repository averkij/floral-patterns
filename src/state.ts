export type Palette = { ink: string; accent: string; paper: string };
export type Rect = { x: number; y: number; width: number; height: number };
export type Visitor = 'butterfly' | 'bee' | 'bird' | 'snail';
export type PageConfig = Palette & {
  seed: number;
  density: number;
  season: 'spring' | 'summer' | 'autumn';
  rect: Rect;
  visitors: Visitor[];
  showFrame: boolean;
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
    density: 1,
    season: 'summer',
    rect: { x: 56, y: 52, width: 108, height: 189 },
    ink: '#34486a',
    accent: '#b99455',
    paper: '#fffefa',
    visitors: ['butterfly', 'bee', 'bird', 'snail'],
    showFrame: true,
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
  { name: 'Delft', colors: { ink: '#34486a', accent: '#b99455', paper: '#fffefa' } },
  { name: 'Herbarium', colors: { ink: '#626b4d', accent: '#d59a8f', paper: '#fffefa' } },
  { name: 'Mulberry', colors: { ink: '#653e54', accent: '#bf8d75', paper: '#faf5ed' } },
  { name: 'Graphite', colors: { ink: '#333a36', accent: '#88958a', paper: '#f5f5ef' } },
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
    p.density = number(page.density, 1, 0.2, 1);
    if (['spring', 'summer', 'autumn'].includes(page.season)) p.season = page.season;
    for (const key of ['ink', 'accent', 'paper'] as const) p[key] = color(page[key], p[key]);
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
    return sanitizeState(
      JSON.parse(decodeURIComponent(window.location.hash.replace(/^#studio=/, ''))),
    );
  } catch {
    return structuredClone(initialState);
  }
}
