/**
 * TypeScript port of Lingdong Huang's orntxt.dh.
 * Source: https://github.com/LingDong-/dither-sketches/blob/8e7a1cbf91fa9736179eba0953e79dc49867f74a/orntxt.dh
 * Source SHA-256: 67dd9e4e73f5005e9c131f2652e3a171eae4e3be623c953417b0cf40f3292678
 * See THIRD_PARTY_NOTICES.md. No upstream reuse license has been established.
 *
 * Browser adaptations: bounded sampling; D3 Voronoi; supplied masks rather than
 * a dilated Caslon glyph; seeded streams; whole-motif containment fitting.
 * Source function names are retained where practical to make the port reviewable.
 */
import { Delaunay } from 'd3-delaunay';
import { maskContains, type Point, type ShapeMask } from './shape-mask';

export type Cubic = [Point, Point, Point, Point];
export type VectorPath = { curves: Cubic[]; closed: boolean; role: 'leaf' | 'vein' | 'petal' | 'stamen' | 'bud' };
export type Motif = { kind: 'leaf' | 'flower' | 'bud' | 'petal'; paths: VectorPath[]; cell: number; fitScale: number };
export type OrntxtScene = {
  cells: Point[][]; sites: Point[]; weights: number[]; vines: Cubic[][]; motifs: Motif[];
  rejected: number; fitted: number; seed: number | string;
};
export type OrntxtOptions = { mask: ShapeMask; density: number; flowerScale: number; seed: number | string };
type Random = () => number;
type Cell = { polygon: Point[]; nodes: number[]; site: Point; original: Point; weight: number; assignment: number[] };

const TAU = Math.PI * 2;
const add = (a: Point, b: Point): Point => [a[0] + b[0], a[1] + b[1]];
const sub = (a: Point, b: Point): Point => [a[0] - b[0], a[1] - b[1]];
const mul = (a: Point, s: number): Point => [a[0] * s, a[1] * s];
const mix = (a: Point, b: Point, t: number): Point => add(mul(a, 1 - t), mul(b, t));
const mag = (a: Point) => Math.hypot(a[0], a[1]);
const dist = (a: Point, b: Point) => mag(sub(a, b));
const unit = (a: Point): Point => mul(a, 1 / (mag(a) || 1));
const normal = (a: Point): Point => [-a[1], a[0]];
const cross = (a: Point, b: Point) => a[0] * b[1] - a[1] * b[0];
const orient = (a: Point, b: Point, c: Point) => cross(sub(b, a), sub(c, a));
const edgeKey = (a: number, b: number) => a < b ? `${a}:${b}` : `${b}:${a}`;

export function sourceRandom(seed: string): Random {
  let state = 2166136261;
  for (let i = 0; i < seed.length; i++) state = Math.imul(state ^ seed.charCodeAt(i), 16777619);
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

function polyArea(points: Point[]): number {
  return points.reduce((sum, a, i) => sum + cross(a, points[(i + 1) % points.length]), 0) / 2;
}

function centroid(points: Point[]): Point {
  let sum = 0, x = 0, y = 0;
  points.forEach((a, i) => { const b = points[(i + 1) % points.length], c = cross(a, b); sum += c; x += (a[0] + b[0]) * c; y += (a[1] + b[1]) * c; });
  return Math.abs(sum) > 1e-8 ? [x / (3 * sum), y / (3 * sum)] : points[0];
}

export function pointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    if ((a[1] > point[1]) !== (b[1] > point[1]) && point[0] < (b[0] - a[0]) * (point[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}

function convexContains(point: Point, polygon: Point[], margin = 0): boolean {
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i], b = polygon[(i + 1) % polygon.length];
    if (orient(a, b, point) < margin * dist(a, b) - 1e-5) return false;
  }
  return true;
}

function convexHull(points: Point[]): Point[] {
  const sorted = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const unique = sorted.filter((point, i) => !i || dist(point, sorted[i - 1]) > 0.001);
  const lower: Point[] = [], upper: Point[] = [];
  for (const point of unique) { while (lower.length > 1 && orient(lower[lower.length - 2], lower[lower.length - 1], point) <= 1e-7) lower.pop(); lower.push(point); }
  for (const point of unique.slice().reverse()) { while (upper.length > 1 && orient(upper[upper.length - 2], upper[upper.length - 1], point) <= 1e-7) upper.pop(); upper.push(point); }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

function lineIntersect(a: Point, b: Point, c: Point, d: Point, ray = false): Point | null {
  const u = sub(b, a), v = sub(d, c), denominator = cross(u, v);
  if (Math.abs(denominator) < 1e-9) return null;
  const delta = sub(c, a), t = cross(delta, v) / denominator, s = cross(delta, u) / denominator;
  return t >= -1e-6 && (ray || t <= 1.000001) && s >= -1e-6 && s <= 1.000001 ? add(a, mul(u, t)) : null;
}

function insideWithClearance(mask: ShapeMask, point: Point, clearance: number): boolean {
  if (!maskContains(mask, ...point)) return false;
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4;
    if (!maskContains(mask, point[0] + Math.cos(angle) * clearance, point[1] + Math.sin(angle) * clearance)) return false;
  }
  return true;
}

function segmentInside(mask: ShapeMask, a: Point, b: Point, clearance = 0): boolean {
  const count = Math.max(2, Math.ceil(dist(a, b) / 1.5));
  for (let i = 0; i <= count; i++) if (!insideWithClearance(mask, mix(a, b, i / count), clearance)) return false;
  return true;
}

function poissonSample(mask: ShapeMask, count: number, random: Random): { sites: Point[]; weights: number[] } {
  const candidates: Point[] = [];
  const sx = mask.width / mask.rasterWidth, sy = mask.height / mask.rasterHeight;
  for (let y = 2; y < mask.rasterHeight - 2; y += 2) for (let x = 2; x < mask.rasterWidth - 2; x += 2) {
    const point: Point = [(x + 0.5) * sx, (y + 0.5) * sy];
    if (insideWithClearance(mask, point, Math.max(sx, sy) * 1.5)) candidates.push(point);
  }
  if (!candidates.length) throw new Error('The selected region is too thin. Try a larger shape or a bolder font.');
  count = Math.min(count, candidates.length, Math.max(4, Math.floor(mask.area / 46)));
  const sites: Point[] = [], weights: number[] = [];
  for (let i = 0; i < count; i++) {
    let maximum = -1, winner: Point = candidates[0];
    for (let trial = 0; trial < 16; trial++) {
      const candidate = candidates[Math.floor(random() * candidates.length)];
      let clearance = Infinity;
      sites.forEach((point, j) => { clearance = Math.min(clearance, dist(candidate, point) / weights[j]); });
      if (clearance > maximum) { maximum = clearance; winner = candidate; }
    }
    if (maximum < 0.5) break;
    sites.push([...winner]); weights.push(i < Math.floor(count * 0.1) ? 2 : 1);
  }
  return { sites, weights };
}

/** Port of convexclip: convex hull plus flags for contour/intersection vertices. */
function convexclip(polygon: Point[], mask: ShapeMask): { polygon: Point[]; boundary: boolean[] } {
  const keep = polygon.filter(point => maskContains(mask, ...point)), boundary: Point[] = [];
  for (const contour of mask.contours) {
    for (let j = 0; j < contour.length; j++) {
      const a = contour[j], b = contour[(j + 1) % contour.length];
      if (pointInPolygon(a, polygon)) { keep.push(a); boundary.push(a); }
      for (let k = 0; k < polygon.length; k++) {
        const hit = lineIntersect(polygon[k], polygon[(k + 1) % polygon.length], a, b);
        if (hit) { keep.push(hit); boundary.push(hit); }
      }
    }
  }
  const hull = convexHull(keep);
  return { polygon: hull, boundary: hull.map(point => boundary.some(other => dist(point, other) < 0.001)) };
}

function calcTurn(a: Point, b: Point, c: Point): number {
  const u = sub(b, a), v = sub(c, b);
  return Math.atan2(cross(u, v), u[0] * v[0] + u[1] * v[1]);
}

/** Direct port of the source tridiagonal natural-cubic solver, not Catmull–Rom. */
export function naturalCubicBezier(points: Point[]): Cubic[] {
  const n = points.length - 1;
  if (n < 1) return [];
  if (n === 1) return [[points[0], mix(points[0], points[1], 1 / 3), mix(points[0], points[1], 2 / 3), points[1]]];
  const solve = (rhs: number[]): number[] => {
    const values = new Array<number>(rhs.length).fill(0), temporary = new Array<number>(rhs.length).fill(0);
    let diagonal = 2; values[0] = rhs[0] / diagonal;
    for (let i = 1; i < rhs.length; i++) { temporary[i] = 1 / diagonal; diagonal = (i < rhs.length - 1 ? 4 : 3.5) - temporary[i]; values[i] = (rhs[i] - values[i - 1]) / diagonal; }
    for (let i = 1; i < rhs.length; i++) values[rhs.length - 1 - i] -= temporary[rhs.length - i] * values[rhs.length - i];
    return values;
  };
  const controls = (coordinates: number[]) => {
    const rhs = [coordinates[0] + 2 * coordinates[1]];
    for (let i = 1; i < n - 1; i++) rhs.push(4 * coordinates[i] + 2 * coordinates[i + 1]);
    rhs.push((8 * coordinates[n - 1] + coordinates[n]) / 2);
    return solve(rhs);
  };
  const x = points.map(point => point[0]), y = points.map(point => point[1]), cx = controls(x), cy = controls(y);
  return Array.from({ length: n }, (_, i): Cubic => [points[i], [cx[i], cy[i]], i < n - 1 ? [2 * x[i + 1] - cx[i + 1], 2 * y[i + 1] - cy[i + 1]] : [(x[n] + cx[n - 1]) / 2, (y[n] + cy[n - 1]) / 2], points[i + 1]]);
}

export function cubicPoint(curve: Cubic, t: number): Point {
  const a = 1 - t;
  return [0, 1].map(axis => a ** 3 * curve[0][axis] + 3 * a * a * t * curve[1][axis] + 3 * a * t * t * curve[2][axis] + t ** 3 * curve[3][axis]) as Point;
}

export function samplePath(path: VectorPath, steps = 24): Point[] {
  const points: Point[] = [];
  path.curves.forEach(curve => { for (let i = 0; i < steps; i++) points.push(cubicPoint(curve, i / steps)); });
  if (path.curves.length) points.push(path.curves[path.curves.length - 1][3]);
  return points;
}

function polyline(points: Point[], role: VectorPath['role'], closed = false): VectorPath {
  const curvePoints = closed ? [...points, points[0]] : points;
  return { curves: curvePoints.slice(0, -1).map((a, i) => [a, mix(a, curvePoints[i + 1], 1 / 3), mix(a, curvePoints[i + 1], 2 / 3), curvePoints[i + 1]]), closed, role };
}

/** Exact three-cubic petal construction from make_petal in orntxt.dh. */
export function makePetal(q0: Point, q1: Point, e: Point): VectorPath {
  const leftTip = add(mix(q0, q1, 0.9), mul(e, 0.3)), rightTip = sub(mix(q0, q1, 0.9), mul(e, 0.3));
  return { closed: true, role: 'petal', curves: [
    [q0, add(mix(q0, q1, 0.3), mul(e, 1.2)), add(q1, e), leftTip],
    [leftTip, add(q1, mul(e, 0.1)), sub(q1, mul(e, 0.1)), rightTip],
    [rightTip, sub(q1, e), sub(mix(q0, q1, 0.3), mul(e, 1.2)), q0],
  ] };
}

function rayPolygon(q0: Point, direction: Point, polygon: Point[]): Point {
  let closest: Point | undefined, length = Infinity;
  for (let i = 0; i < polygon.length; i++) {
    const hit = lineIntersect(q0, add(q0, direction), polygon[i], polygon[(i + 1) % polygon.length], true);
    if (hit && dist(q0, hit) > 1e-5 && dist(q0, hit) < length) { closest = hit; length = dist(q0, hit); }
  }
  return closest ?? add(q0, direction);
}

/** Port of opt_flower: a directional fan selected from long forward rays. */
function optFlower(attachment: Point, cell: Cell, random: Random): VectorPath[] {
  const p0 = attachment, p1 = cell.site, dp = sub(p1, p0), q0 = mix(p0, p1, 0.3), size = mag(dp), angle0 = Math.atan2(dp[1], dp[0]);
  let rays: Point[] = [];
  for (let i = 0; i < 32; i++) {
    const angle = (i / 31 - 0.5) * Math.PI + angle0;
    const hit = rayPolygon(q0, [Math.cos(angle), Math.sin(angle)], cell.polygon);
    if (dist(hit, q0) > size) rays.push(hit);
  }
  if (rays.length > 2) rays = rays.slice(1, -1);
  const indices = rays.map((_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [indices[i], indices[j]] = [indices[j], indices[i]]; }
  const count = Math.min(8, rays.length), paths: VectorPath[] = [];
  for (let i = 0; i < count; i++) {
    const index = indices[i], t = rays.length > 1 ? index / (rays.length - 1) : 0.5, ti = i / count;
    const shortening = i > count / 2 ? 0.3 : 0.1;
    const q1 = mix(q0, rays[index], 1 - shortening - ti * 0.1), d = sub(q1, q0);
    if (i === Math.floor(count / 2)) {
      for (let j = 0; j < 8; j++) {
        const a = random() * TAU, r = random() * size * 0.4, origin = add(p1, [Math.cos(a) * r, Math.sin(a) * r]);
        const angle = Math.atan2(origin[1] - q0[1], origin[0] - q0[0]), points: Point[] = [q0];
        for (let k = 0; k < 10; k++) { const turn = (k / 9 - 0.5) * Math.PI * 1.6 + angle; points.push(add(origin, [Math.cos(turn) * 3, Math.sin(turn) * 3])); }
        points.push(q0); paths.push(polyline(points, 'stamen', true));
      }
    }
    const e = mul(unit(normal(d)), size * (Math.sin(t * Math.PI) * 0.1 + 0.2));
    paths.push(makePetal(q0, q1, e));
  }
  return paths;
}

/** Source leaf silhouette and sampled asymmetric veins. */
function makeLeaf(a: Point, b: Point, site: Point, far: Point): VectorPath[] {
  let d = mul(sub(b, a), 0.5);
  const q0 = mix(a, b, 0.5), q1 = mix(q0, site, 0.5), q2 = site, q3 = mix(site, far, 0.5), length = dist(far, q0);
  if (mag(d) < length * 0.15) d = mul(unit(d), length * 0.15);
  d = mul(d, 1.3);
  const leaf: VectorPath = { role: 'leaf', closed: true, curves: [[q0, sub(q1, d), sub(q2, mul(d, 0.65)), q3], [q3, add(q2, mul(d, 0.65)), add(q1, d), q0]] };
  const outline = samplePath(leaf, 20), center: Point[] = [], paths = [leaf];
  for (let i = 0; i < outline.length * 0.42; i++) center.push(mix(outline[i], outline[outline.length - 1 - i], 0.4));
  const leafArea = Math.abs(polyArea(outline));
  for (let i = 3; i < center.length - 3; i += 3) {
    const t = i / center.length * 0.7 + 0.3, j = Math.floor(outline.length * 0.5 * t);
    const edge = ((i - 3) / 3) & 1 ? outline[j] : outline[outline.length - 1 - j];
    if (leafArea > 400) paths.push(polyline([center[i], mix(center[i], edge, 0.7)], 'vein'));
  }
  if (leafArea > 100) paths.push(polyline(center, 'vein'));
  return paths;
}

function ellipse(center: Point, direction: Point, rx: number, ry: number): VectorPath {
  const u = unit(direction), v = normal(u), k = 0.5522847498;
  const at = (x: number, y: number) => add(center, add(mul(u, x), mul(v, y)));
  return { role: 'bud', closed: true, curves: [
    [at(rx, 0), at(rx, k * ry), at(k * rx, ry), at(0, ry)], [at(0, ry), at(-k * rx, ry), at(-rx, k * ry), at(-rx, 0)],
    [at(-rx, 0), at(-rx, -k * ry), at(-k * rx, -ry), at(0, -ry)], [at(0, -ry), at(k * rx, -ry), at(rx, -k * ry), at(rx, 0)],
  ] };
}

/** Geometric adaptation: scale a COMPLETE motif, never cut it with an SVG clip. */
function fitMotif(paths: VectorPath[], center: Point, cell: Cell, mask: ShapeMask, requestedScale = 1): { paths: VectorPath[]; scale: number } | null {
  const safety = 1.1;
  const transform = (scale: number) => paths.map(path => ({ ...path, curves: path.curves.map(curve => curve.map(point => mix(center, point, scale)) as Cubic) }));
  const fits = (candidate: VectorPath[]) => {
    for (const path of candidate) {
      const polygon = samplePath(path);
      if (polygon.some(point => !convexContains(point, cell.polygon, safety) || !insideWithClearance(mask, point, safety))) return false;
      if (!path.closed || path.role === 'stamen') continue;
      const minX = Math.min(...polygon.map(point => point[0])), maxX = Math.max(...polygon.map(point => point[0]));
      const minY = Math.min(...polygon.map(point => point[1])), maxY = Math.max(...polygon.map(point => point[1]));
      // Detect a counter entirely enclosed by a filled motif, not just crossed edges.
      const step = Math.max(1.5, mask.width / mask.rasterWidth * 1.5);
      for (let y = minY; y < maxY; y += step) for (let x = minX; x < maxX; x += step) {
        if (!maskContains(mask, x, y) && pointInPolygon([x, y], polygon)) return false;
      }
    }
    return true;
  };
  if (!paths.length || !insideWithClearance(mask, center, safety)) return null;
  // Find a geometric ceiling independently of the slider value. Otherwise a
  // larger request can land on a smaller discrete fallback and shrink a flower.
  let scale = 1.5, failed = 1.5;
  for (let attempt = 0; attempt < 22; attempt++, scale *= 0.9) {
    if (!fits(transform(scale))) { failed = scale; continue; }
    let low = scale, high = failed;
    for (let refinement = 0; refinement < 5; refinement++) {
      const middle = (low + high) / 2;
      if (fits(transform(middle))) low = middle; else high = middle;
    }
    let actual = Math.min(Math.max(0.2, requestedScale), low);
    // A deeply concave mask need not be star-shaped around its site. Recheck a
    // requested smaller scale rather than assuming every inward move stays valid.
    for (let inward = 0; inward < 12; inward++, actual *= 0.9) {
      const candidate = transform(actual);
      if (fits(candidate)) return { paths: candidate, scale: actual };
    }
    return null;
  }
  return null;
}

function safeVines(points: Point[], mask: ShapeMask): Cubic[][] {
  const routes: Cubic[][] = [], current: Cubic[] = [];
  for (const original of naturalCubicBezier(points)) {
    let accepted: Cubic | undefined;
    for (const factor of [1, 0.75, 0.5, 0.25, 0]) {
      const curve: Cubic = [original[0], mix(mix(original[0], original[3], 1 / 3), original[1], factor), mix(mix(original[0], original[3], 2 / 3), original[2], factor), original[3]];
      const samples = Math.max(16, Math.ceil(dist(curve[0], curve[3]) / 1.4));
      if (Array.from({ length: samples + 1 }, (_, i) => cubicPoint(curve, i / samples)).every(point => insideWithClearance(mask, point, 1.5))) { accepted = curve; break; }
    }
    if (accepted) current.push(accepted);
    else if (current.length) { routes.push(current.splice(0)); }
  }
  if (current.length) routes.push(current);
  return routes;
}

export function buildOrntxtScene(options: OrntxtOptions): OrntxtScene {
  const { mask, seed } = options, random = sourceRandom(`orntxt-port/1:${seed}:layout`);
  const density = Math.max(60, Math.min(260, Math.round(Number.isFinite(options.density) ? options.density : 180)));
  const samples = poissonSample(mask, density, random);
  const voronoi = Delaunay.from(samples.sites).voronoi([0, 0, mask.width, mask.height]);
  const cells: Cell[] = [], cornerPoints: Point[] = [], neighbors: number[][] = [], cornerCells: number[][] = [];
  const indexByPoint = new Map<string, number>();
  samples.sites.forEach((site, index) => {
    const raw = voronoi.cellPolygon(index); if (!raw) return;
    const clipped = convexclip(raw.slice(0, -1) as Point[], mask);
    if (clipped.polygon.length < 3 || Math.abs(polyArea(clipped.polygon)) < 10) return;
    // Source exempts all-boundary cells so narrow glyph segments still get a graph.
    if (clipped.boundary.every(Boolean)) clipped.boundary.fill(false);
    const cellIndex = cells.length;
    const nodes = clipped.polygon.map((point, i) => {
      if (clipped.boundary[i]) return -1;
      const key = `${Math.round(point[0] * 10000)}:${Math.round(point[1] * 10000)}`;
      let node = indexByPoint.get(key);
      if (node === undefined) { node = cornerPoints.length; indexByPoint.set(key, node); cornerPoints.push([...point]); neighbors.push([]); cornerCells.push([]); }
      cornerCells[node].push(cellIndex); return node;
    });
    nodes.forEach((a, i) => {
      const b = nodes[(i + 1) % nodes.length];
      if (a < 0 || b < 0 || a === b || !segmentInside(mask, cornerPoints[a], cornerPoints[b])) return;
      if (!neighbors[a].includes(b)) neighbors[a].push(b);
      if (!neighbors[b].includes(a)) neighbors[b].push(a);
    });
    cells.push({ polygon: clipped.polygon, nodes, site: [...site], original: [...site], weight: samples.weights[index], assignment: [] });
  });

  // Source relax(): three secondary Voronoi iterations, no motion for boundary cells.
  for (let iteration = 0; iteration < 3 && cornerPoints.length > 2; iteration++) {
    const secondary = Delaunay.from(cornerPoints).voronoi([0, 0, mask.width, mask.height]);
    const moves = cornerPoints.map((point, i) => {
      const polygon = secondary.cellPolygon(i)?.slice(0, -1) as Point[] | undefined;
      if (!polygon?.length || polygon.some(vertex => !maskContains(mask, ...vertex))) return point;
      let force = mul(sub(centroid(polygon), point), 0.5);
      cornerCells[i].forEach(index => { const cell = cells[index]; force = add(force, mul(sub(point, cell.site), (cell.weight - 1) * 0.1)); });
      const candidate = add(point, force);
      return maskContains(mask, ...candidate) ? candidate : point;
    });
    moves.forEach((point, i) => { cornerPoints[i] = point; });
  }
  cells.forEach(cell => {
    cell.polygon = cell.polygon.map((point, i) => cell.nodes[i] < 0 ? point : cornerPoints[cell.nodes[i]]);
    // A hull can bridge a counter. Retain an interior source sample if its centroid falls outside.
    const center = centroid(cell.polygon);
    cell.site = insideWithClearance(mask, center, 1.2) && convexContains(center, cell.polygon) ? center : cell.original;
  });
  neighbors.forEach((list, i) => { neighbors[i] = list.filter(j => segmentInside(mask, cornerPoints[i], cornerPoints[j])); });
  const visited = new Uint16Array(cornerPoints.length), paths: number[][] = [];
  const position = (index: number): Point => index < -1 ? cells[-index - 2].site : cornerPoints[index];

  // Iterative translation of recursive walk/walk_all keeps browser call stacks bounded.
  const walk = (previous: number, start: number): number[] => {
    const path = previous === -1 ? [] : [previous];
    let current = start;
    while (!visited[current] && path.length < cornerPoints.length + 2) {
      path.push(current); visited[current] = 1;
      let next = -1, flower = -1;
      for (const neighbor of neighbors[current]) {
        if (visited[neighbor]) continue;
        if (path.length < 2) { next = neighbor; break; }
        const p0 = position(path[path.length - 2]), p1 = cornerPoints[current], p2 = cornerPoints[neighbor], angle = calcTurn(p0, p1, p2);
        if (!(angle > -Math.PI / 4 && angle < Math.PI / 2)) continue;
        for (const index of cornerCells[neighbor]) {
          if (cells[index].weight > 1 && !cells[index].assignment.length && Math.abs(calcTurn(p1, p2, cells[index].site)) < Math.PI / 2) { flower = index; break; }
        }
        next = neighbor; break;
      }
      if (next < 0) break;
      if (flower >= 0) { cells[flower].assignment.push(next); visited[next] = 1; path.push(next, -2 - flower); break; }
      current = next;
    }
    return path;
  };
  for (let rounds = 0; rounds < cornerPoints.length * 2 + cells.length; rounds++) {
    let previous = -1, start = -1;
    // Source branches from an interior node of an existing path first.
    search: for (const path of paths) for (let i = 1; i < path.length - 1; i++) {
      if (path[i] < 0) continue;
      const neighbor = neighbors[path[i]].find(index => !visited[index]);
      if (neighbor !== undefined) { previous = path[i]; start = neighbor; visited[previous]++; break search; }
    }
    if (start < 0) {
      for (let i = 0; i < cells.length; i++) {
        if (cells[i].weight <= 1 || cells[i].assignment.length) continue;
        const corner = cells[i].nodes.find(index => index >= 0 && !visited[index]);
        if (corner !== undefined) { cells[i].assignment.push(corner); previous = -2 - i; start = corner; break; }
      }
    }
    if (start < 0) start = visited.findIndex(value => !value);
    if (start < 0) break;
    const path = walk(previous, start); if (path.length > 1) paths.push(path);
  }
  const routedEdges = new Set<string>();
  paths.forEach(path => path.slice(0, -1).forEach((a, i) => { if (a >= 0 && path[i + 1] >= 0) routedEdges.add(edgeKey(a, path[i + 1])); }));
  const ends: number[] = [];
  paths.forEach(path => {
    let end = path[path.length - 1];
    if (end >= 0) {
      const heavy = cornerCells[end].find(index => cells[index].weight > 1 && !cells[index].assignment.length);
      if (heavy !== undefined) { cells[heavy].assignment.push(end); path.push(-2 - heavy); end = -2 - heavy; }
    }
    let best = -1, largest = 0;
    if (end >= 0 && visited[end] <= 1) {
      const previous = position(path[path.length - 2]);
      cornerCells[end].forEach(index => {
        const cell = cells[index], size = Math.abs(polyArea(cell.polygon));
        if (!cell.assignment.length && size > largest && Math.abs(calcTurn(previous, cornerPoints[end], cell.site)) < Math.PI / 2) { best = index; largest = size; }
      });
    }
    if (best >= 0) cells[best].assignment.push(end);
    ends.push(best);
  });
  cells.forEach(cell => {
    if (cell.assignment.length) return;
    let best = 0, assignment: number[] = [];
    cell.nodes.forEach((a, j) => {
      const b = cell.nodes[(j + 1) % cell.nodes.length];
      if (a < 0 || b < 0 || !routedEdges.has(edgeKey(a, b))) return;
      cell.polygon.forEach((point, k) => {
        if (k === j || k === (j + 1) % cell.nodes.length) return;
        const height = Math.abs(orient(cornerPoints[a], cornerPoints[b], point)) / (dist(cornerPoints[a], cornerPoints[b]) || 1);
        if (height > best) { best = height; assignment = [a, b, k]; }
      });
    });
    cell.assignment = assignment;
  });

  const scene: OrntxtScene = { cells: cells.map(cell => cell.polygon), sites: cells.map(cell => cell.site), weights: cells.map(cell => cell.weight), vines: [], motifs: [], rejected: 0, fitted: 0, seed };
  const addMotif = (kind: Motif['kind'], index: number, geometry: VectorPath[], scale = 1) => {
    const cell = cells[index], fitted = fitMotif(geometry, cell.site, cell, mask, scale);
    if (!fitted) { scene.rejected++; return; }
    if (fitted.scale < scale - 1e-5) scene.fitted++;
    scene.motifs.push({ kind, cell: index, paths: fitted.paths, fitScale: fitted.scale });
  };
  cells.forEach((cell, index) => {
    if (cell.assignment.length === 3) addMotif('leaf', index, makeLeaf(cornerPoints[cell.assignment[0]], cornerPoints[cell.assignment[1]], cell.site, cell.polygon[cell.assignment[2]]));
  });
  paths.forEach((path, i) => {
    const points = path.map(position); if (ends[i] >= 0) points.push(cells[ends[i]].site);
    scene.vines.push(...safeVines(points, mask));
    path.forEach((node, j) => {
      if (node >= -1) return;
      const index = -node - 2, attachment = cornerPoints[path[j ? j - 1 : j + 1]];
      const detail = sourceRandom(`orntxt-port/1:${seed}:flower:${index}`);
      addMotif('flower', index, optFlower(attachment, cells[index], detail), options.flowerScale);
    });
    if (ends[i] >= 0) {
      const index = ends[i], center = cells[index].site, direction = sub(center, cornerPoints[path[path.length - 1]]);
      addMotif('bud', index, [ellipse(add(center, mul(unit(direction), 1.8)), direction, 7.2, 6.3), ellipse(add(center, add(mul(unit(direction), 3.6), mul(normal(unit(direction)), -1.8))), direction, 9, 6.3)]);
    }
  });
  cells.forEach((cell, index) => {
    if (cell.assignment.length) return;
    const detail = sourceRandom(`orntxt-port/1:${seed}:petal:${index}`), d = mul(unit([detail() * 2 - 1, detail() * 2 - 1]), 8);
    addMotif('petal', index, [makePetal(sub(cell.site, d), add(cell.site, d), mul(normal(d), 1 / 1.5))]);
  });
  // Fitting moves a leaf base inward. Reattach the complete leaf to the nearest
  // original vine rather than leaving a visible gap or extending a cut contour.
  const vineSamples = scene.vines.flatMap(route => route.flatMap(curve => Array.from({ length: 12 }, (_, i) => cubicPoint(curve, i / 11))));
  for (const motif of scene.motifs) {
    if (motif.kind !== 'leaf') continue;
    const base = motif.paths[0].curves[0][0];
    let nearest: Point | undefined, nearestDistance = Math.sqrt(Math.abs(polyArea(cells[motif.cell].polygon))) * 0.55;
    for (const point of vineSamples) {
      const distance = dist(base, point);
      if (distance < nearestDistance && segmentInside(mask, base, point, 1.5)) { nearest = point; nearestDistance = distance; }
    }
    if (nearest && nearestDistance > 0.7) scene.vines.push(naturalCubicBezier([nearest, base]));
  }
  return scene;
}
