import type { Point, ShapeMask } from './shape-mask';
import { buildOrntxtScene, type Cubic, type Motif, type VectorPath } from './shape-orntxt';

export const SHAPE_ENGINE_VERSION = 'orntxt-port/1.0.0';
export const ORNTXT_REVISION = '8e7a1cbf91fa9736179eba0953e79dc49867f74a';

export interface ShapePatternOptions {
  width: number;
  height: number;
  seed: number | string;
  density: number;
  flowerScale?: number;
  palette: { ink: string; accent: string; paper: string };
  mask: ShapeMask;
  showCells?: boolean;
}

export interface ShapePatternResult {
  svg: string;
  stats: { cells: number; flowers: number; leaves: number; vines: number; generationMs: number; fitted?: number; rejected?: number };
  version: string;
}

const f = (value: number) => Number(value.toFixed(3));
const p = (point: Point) => `${f(point[0])} ${f(point[1])}`;
const escapeXml = (text: string) => text.replace(/[<>&"']/g, char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[char]!));
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));

function blend(a: string, b: string, amount: number): string {
  const channels = (color: string) => {
    const value = color.length === 4 ? color.slice(1).split('').map(char => char + char).join('') : color.slice(1);
    return [0, 2, 4].map(index => parseInt(value.slice(index, index + 2), 16));
  };
  const first = channels(a), second = channels(b);
  return '#' + first.map((value, index) => Math.round(value + (second[index] - value) * amount).toString(16).padStart(2, '0')).join('');
}

function curvePath(curves: Cubic[]): string {
  if (!curves.length) return '';
  return `M${p(curves[0][0])}` + curves.map(curve => `C${p(curve[1])} ${p(curve[2])} ${p(curve[3])}`).join('');
}

export function generateShapePattern(options: ShapePatternOptions): ShapePatternResult {
  const started = performance.now(), { width, height, mask } = options;
  if (mask.width !== width || mask.height !== height) throw new Error('The shape and artwork dimensions must match.');
  if (!mask.path || !mask.data.length || mask.area < 32) throw new Error('Select a region before generating a pattern.');
  const density = Math.round(clamp(Number.isFinite(options.density) ? options.density : 180, 60, 260));
  const flowerScale = clamp(Number.isFinite(options.flowerScale) ? options.flowerScale! : 1, 0.65, 1.5);
  const scene = buildOrntxtScene({ mask, seed: options.seed, density, flowerScale });
  if (!scene.cells.length) throw new Error('The selected region has no usable cells. Try a larger shape.');
  const valid = (color: string, fallback: string) => /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(color) ? color : fallback;
  const ink = valid(options.palette.ink, '#626b4d'), accent = valid(options.palette.accent, '#d59a8f'), paper = valid(options.palette.paper, '#fffefa');
  const line = blend(ink, '#151b15', 0.5), leaf = blend(ink, paper, 0.31), vine = blend(accent, paper, 0.65);
  const renderPath = (path: VectorPath, index: number) => {
    const fill = path.role === 'vein' ? 'none' : path.role === 'leaf' || path.role === 'bud' ? leaf : path.role === 'stamen' ? blend(accent, paper, 0.38) : blend(accent, paper, index % 3 * 0.07);
    return `<path d="${curvePath(path.curves)}${path.closed ? 'Z' : ''}" fill="${fill}" stroke="${line}" stroke-width="${path.role === 'vein' ? 0.7 : 1}" stroke-linecap="round" stroke-linejoin="round"/>`;
  };
  const renderMotif = (motif: Motif) => `<g data-element="${motif.kind}" data-fit="${f(motif.fitScale)}">${motif.paths.map(renderPath).join('')}</g>`;
  const buds = scene.motifs.filter(motif => motif.kind === 'bud').map(renderMotif).join('');
  const leaves = scene.motifs.filter(motif => motif.kind === 'leaf').map(renderMotif).join('');
  const vines = scene.vines.map(curves => `<path d="${curvePath(curves)}" fill="none" stroke="${line}" stroke-width="2.8" stroke-linecap="round"/><path d="${curvePath(curves)}" fill="none" stroke="${vine}" stroke-width="1.3" stroke-linecap="round"/>`).join('');
  const flowers = scene.motifs.filter(motif => motif.kind === 'flower' || motif.kind === 'petal').map(renderMotif).join('');
  const overlay = options.showCells ? `<g data-overlay="cells" fill="none" stroke="${accent}" stroke-width="0.7" stroke-dasharray="3 3" opacity="0.6">${scene.cells.map(cell => `<path d="M${cell.map(p).join('L')}Z"/>`).join('')}</g><g data-overlay="sites" fill="${ink}">${scene.sites.map((site, index) => `<circle cx="${f(site[0])}" cy="${f(site[1])}" r="${scene.weights[index] > 1 ? 2.5 : 1.4}"/>`).join('')}</g>` : '';
  const metadata = escapeXml(JSON.stringify({ algorithm: SHAPE_ENGINE_VERSION, sourceRevision: ORNTXT_REVISION, seed: options.seed, width, height, density, flowerScale, palette: { ink, accent, paper }, maskPath: mask.path, containment: 'Complete geometric motifs fitted before rendering; no SVG clipping.', fitted: scene.fitted, rejected: scene.rejected }));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Цветочный узор внутри фигуры"><title>Цветочная фигура · вариант ${escapeXml(String(options.seed))}</title><desc>Браузерная адаптация orntxt.dh автора Lingdong Huang. Цветы, листья и стебли вписаны в область без обрезки SVG.</desc><metadata>${metadata}</metadata><rect width="${width}" height="${height}" fill="${paper}"/>${buds}${leaves}${vines}${flowers}${overlay}</svg>`;
  return { svg, version: SHAPE_ENGINE_VERSION, stats: { cells: scene.cells.length, flowers: scene.motifs.filter(motif => motif.kind === 'flower').length, leaves: scene.motifs.filter(motif => motif.kind === 'leaf').length, vines: scene.vines.length, fitted: scene.fitted, rejected: scene.rejected, generationMs: Math.round(performance.now() - started) } };
}
