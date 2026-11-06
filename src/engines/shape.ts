import { Delaunay } from 'd3-delaunay';
import { maskContains, type Point, type ShapeMask } from './shape-mask';

/**
 * An independent experiment based on Lingdong Huang's published project overview:
 * https://www.media.mit.edu/projects/non-overlapping-floral-patterns/overview/
 * No Dither source is copied or translated. The mask clipping is approximate; final
 * SVG clips preserve the silhouette, but are not a proof of geometric non-overlap.
 */
export const SHAPE_ENGINE_VERSION = 'huang-inspired/1.0.0';

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
  stats: { cells: number; flowers: number; leaves: number; vines: number; generationMs: number };
  version: string;
}

type Site = { point: Point; weight: number };
type Corner = { point: Point; boundary: boolean; neighbors: Set<number>; cells: number[] };
type Cell = {
  site: Site;
  polygon: Point[];
  corners: number[];
  area: number;
  flower: boolean;
  prominent: boolean;
  attachment?: Point;
  endpoint?: number;
};
type Layout = { cells: Cell[]; corners: Corner[]; routes: number[][]; routedEdges: Set<string> };
type Random = () => number;

const TAU = Math.PI * 2;
const f = (n: number) => Number(n.toFixed(2));
const p = (point: Point) => `${f(point[0])} ${f(point[1])}`;
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
const distance = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const mix = (a: Point, b: Point, t: number): Point => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
];
const cross = (a: Point, b: Point, c: Point) =>
  (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
const edgeKey = (a: number, b: number) => (a < b ? `${a}:${b}` : `${b}:${a}`);
const escapeXml = (text: string) =>
  text.replace(
    /[<>&"']/g,
    (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[char]!,
  );

function randomStream(seed: string): Random {
  let state = 2166136261;
  for (let i = 0; i < seed.length; i++) state = Math.imul(state ^ seed.charCodeAt(i), 16777619);
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function area(polygon: Point[]): number {
  let sum = 0;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i],
      b = polygon[(i + 1) % polygon.length];
    sum += a[0] * b[1] - a[1] * b[0];
  }
  return Math.abs(sum) / 2;
}

function centroid(polygon: Point[]): Point {
  let x = 0,
    y = 0,
    sum = 0;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i],
      b = polygon[(i + 1) % polygon.length];
    const weight = a[0] * b[1] - b[0] * a[1];
    x += (a[0] + b[0]) * weight;
    y += (a[1] + b[1]) * weight;
    sum += weight;
  }
  if (Math.abs(sum) < 0.001) return polygon[0] ?? [0, 0];
  return [x / (3 * sum), y / (3 * sum)];
}

function pointInConvex(point: Point, polygon: Point[]): boolean {
  let orientation = 0;
  for (let i = 0; i < polygon.length; i++) {
    const side = cross(polygon[i], polygon[(i + 1) % polygon.length], point);
    if (Math.abs(side) < 0.001) continue;
    const next = Math.sign(side);
    if (orientation && next !== orientation) return false;
    orientation = next;
  }
  return true;
}

function convexHull(points: Point[]): Point[] {
  const sorted = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const unique = sorted.filter((point, i) => !i || distance(point, sorted[i - 1]) > 0.03);
  if (unique.length <= 3) return unique;
  const lower: Point[] = [],
    upper: Point[] = [];
  for (const point of unique) {
    while (
      lower.length > 1 &&
      cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0.001
    )
      lower.pop();
    lower.push(point);
  }
  for (const point of unique.slice().reverse()) {
    while (
      upper.length > 1 &&
      cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0.001
    )
      upper.pop();
    upper.push(point);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

function intersection(a: Point, b: Point, c: Point, d: Point): Point | null {
  const ux = b[0] - a[0],
    uy = b[1] - a[1],
    vx = d[0] - c[0],
    vy = d[1] - c[1];
  const divisor = ux * vy - uy * vx;
  if (Math.abs(divisor) < 1e-8) return null;
  const dx = c[0] - a[0],
    dy = c[1] - a[1];
  const t = (dx * vy - dy * vx) / divisor,
    s = (dx * uy - dy * ux) / divisor;
  return t >= -1e-6 && t <= 1.000001 && s >= -1e-6 && s <= 1.000001
    ? [a[0] + t * ux, a[1] + t * uy]
    : null;
}

function containsNear(mask: ShapeMask, point: Point): boolean {
  const e = Math.max(mask.width / mask.rasterWidth, mask.height / mask.rasterHeight) * 1.3;
  return (
    maskContains(mask, point[0], point[1]) ||
    maskContains(mask, point[0] + e, point[1]) ||
    maskContains(mask, point[0] - e, point[1]) ||
    maskContains(mask, point[0], point[1] + e) ||
    maskContains(mask, point[0], point[1] - e)
  );
}

function isBoundary(mask: ShapeMask, point: Point): boolean {
  const e = Math.max(mask.width / mask.rasterWidth, mask.height / mask.rasterHeight) * 2;
  return (
    !maskContains(mask, point[0] + e, point[1]) ||
    !maskContains(mask, point[0] - e, point[1]) ||
    !maskContains(mask, point[0], point[1] + e) ||
    !maskContains(mask, point[0], point[1] - e)
  );
}

function segmentInside(mask: ShapeMask, a: Point, b: Point): boolean {
  const step = Math.max(
    1,
    Math.min(mask.width / mask.rasterWidth, mask.height / mask.rasterHeight) * 1.5,
  );
  const checks = Math.max(2, Math.ceil(distance(a, b) / step));
  for (let i = 1; i < checks; i++) {
    if (!containsNear(mask, mix(a, b, i / checks))) return false;
  }
  return true;
}

/** Weighted best-candidate sampling is layout-only; changing colors does not change it. */
function sample(mask: ShapeMask, requested: number, random: Random): Site[] {
  const candidates: Point[] = [];
  const sx = mask.width / mask.rasterWidth,
    sy = mask.height / mask.rasterHeight;
  for (let y = 2; y < mask.rasterHeight - 2; y += 3) {
    for (let x = 2; x < mask.rasterWidth - 2; x += 3) {
      const index = y * mask.rasterWidth + x;
      if (
        mask.data[index] &&
        mask.data[index - 2] &&
        mask.data[index + 2] &&
        mask.data[index - 2 * mask.rasterWidth] &&
        mask.data[index + 2 * mask.rasterWidth]
      )
        candidates.push([(x + 0.5) * sx, (y + 0.5) * sy]);
    }
  }
  if (!candidates.length)
    throw new Error('The selected region is too thin. Try a larger shape or a bolder font.');
  const count = Math.min(requested, Math.max(4, Math.floor(mask.area / 46)), candidates.length);
  const sites: Site[] = [];
  for (let i = 0; i < count; i++) {
    let winner: Point = candidates[Math.floor(random() * candidates.length)],
      score = -1;
    for (let attempt = 0; attempt < 20; attempt++) {
      const candidate = candidates[Math.floor(random() * candidates.length)];
      let clearance = Infinity;
      for (const site of sites) {
        const d =
          ((candidate[0] - site.point[0]) ** 2 + (candidate[1] - site.point[1]) ** 2) /
          (site.weight * site.weight);
        if (d < clearance) clearance = d;
      }
      if (clearance > score) {
        winner = candidate;
        score = clearance;
      }
    }
    if (score < 2) break;
    const heavy = random() < 0.14;
    // Early heavy anchors have room to reserve a visible hierarchy before infill.
    const weight = i < Math.max(3, Math.round(count * 0.06)) ? 2.7 : heavy ? 1.95 : 1;
    sites.push({ point: [...winner], weight });
  }
  return sites;
}

/** Hull clipping follows the published geometric idea and intentionally remains approximate. */
function clipCell(polygon: Point[], mask: ShapeMask): Point[] {
  const points = polygon.filter((point) => maskContains(mask, point[0], point[1]));
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  polygon.forEach((point) => {
    minX = Math.min(minX, point[0]);
    minY = Math.min(minY, point[1]);
    maxX = Math.max(maxX, point[0]);
    maxY = Math.max(maxY, point[1]);
  });
  for (const contour of mask.contours) {
    for (let j = 0; j < contour.length; j++) {
      const a = contour[j],
        b = contour[(j + 1) % contour.length];
      if (
        Math.max(a[0], b[0]) < minX ||
        Math.min(a[0], b[0]) > maxX ||
        Math.max(a[1], b[1]) < minY ||
        Math.min(a[1], b[1]) > maxY
      )
        continue;
      if (pointInConvex(a, polygon)) points.push(a);
      for (let k = 0; k < polygon.length; k++) {
        const hit = intersection(a, b, polygon[k], polygon[(k + 1) % polygon.length]);
        if (hit) points.push(hit);
      }
    }
  }
  return convexHull(points);
}

function layoutCells(sites: Site[], mask: ShapeMask, random: Random): Layout {
  const voronoi = Delaunay.from(sites.map((site) => site.point)).voronoi([
    0,
    0,
    mask.width,
    mask.height,
  ]);
  const cells: Cell[] = [],
    corners: Corner[] = [],
    cornerIndex = new Map<string, number>();
  sites.forEach((site, siteIndex) => {
    const raw = voronoi.cellPolygon(siteIndex);
    if (!raw) return;
    const polygon = clipCell(raw.slice(0, -1) as Point[], mask);
    if (polygon.length < 3 || area(polygon) < 9) return;
    const index = cells.length;
    const ids = polygon.map((point) => {
      const key = `${Math.round(point[0] * 20)}:${Math.round(point[1] * 20)}`;
      let id = cornerIndex.get(key);
      if (id === undefined) {
        id = corners.length;
        cornerIndex.set(key, id);
        corners.push({
          point: [...point],
          boundary: isBoundary(mask, point),
          neighbors: new Set(),
          cells: [],
        });
      }
      corners[id].cells.push(index);
      return id;
    });
    ids.forEach((id, i) => {
      const next = ids[(i + 1) % ids.length];
      const a = corners[id].point,
        b = corners[next].point;
      if (distance(a, b) < 0.3) return;
      // Prevent routing across a counter or across disconnected regions.
      if (!segmentInside(mask, a, b)) return;
      corners[id].neighbors.add(next);
      corners[next].neighbors.add(id);
    });
    cells.push({
      site,
      polygon,
      corners: ids,
      area: area(polygon),
      flower: false,
      prominent: false,
    });
  });

  // A second Voronoi diagram redistributes corners. Boundary corners stay fixed.
  const heavy = sites.filter((site) => site.weight > 1);
  for (let iteration = 0; iteration < 2 && corners.length > 3; iteration++) {
    const secondary = Delaunay.from(corners.map((corner) => corner.point)).voronoi([
      0,
      0,
      mask.width,
      mask.height,
    ]);
    const updates = corners.map((corner, index): Point => {
      if (corner.boundary) return corner.point;
      const polygon = secondary.cellPolygon(index);
      if (!polygon) return corner.point;
      const center = centroid(polygon.slice(0, -1) as Point[]);
      let dx = (center[0] - corner.point[0]) * 0.16,
        dy = (center[1] - corner.point[1]) * 0.16;
      for (const site of heavy) {
        const x = corner.point[0] - site.point[0],
          y = corner.point[1] - site.point[1],
          squared = x * x + y * y;
        if (squared > 4 && squared < (mask.area / sites.length) * 3) {
          dx += (x / squared) * 4;
          dy += (y / squared) * 4;
        }
      }
      const length = Math.hypot(dx, dy),
        limit = Math.min(1, 2.2 / (length || 1));
      const next: Point = [corner.point[0] + dx * limit, corner.point[1] + dy * limit];
      return maskContains(mask, next[0], next[1]) ? next : corner.point;
    });
    updates.forEach((point, i) => {
      corners[i].point = point;
    });
  }
  cells.forEach((cell) => {
    cell.polygon = cell.corners.map((id) => corners[id].point);
    cell.area = area(cell.polygon);
  });
  corners.forEach((corner, id) => {
    for (const neighbor of corner.neighbors) {
      if (neighbor > id && !segmentInside(mask, corner.point, corners[neighbor].point)) {
        corner.neighbors.delete(neighbor);
        corners[neighbor].neighbors.delete(id);
      }
    }
  });

  // A least-turn spanning forest on cell edges leaves the centers free for motifs.
  const visited = new Set<number>(),
    routes: number[][] = [],
    routedEdges = new Set<string>();
  const starts = corners
    .map((_, i) => i)
    .sort((a, b) => {
      const weightedA = corners[a].cells.some((index) => cells[index].site.weight > 1);
      const weightedB = corners[b].cells.some((index) => cells[index].site.weight > 1);
      return Number(weightedB) - Number(weightedA) || corners[a].point[1] - corners[b].point[1];
    });
  let iterations = 0;
  while (iterations++ < corners.length * 2) {
    let start = starts.find(
      (id) => visited.has(id) && [...corners[id].neighbors].some((next) => !visited.has(next)),
    );
    if (start === undefined) start = starts.find((id) => !visited.has(id));
    if (start === undefined) break;
    const route = [start];
    visited.add(start);
    while (route.length < 38) {
      const current = route[route.length - 1],
        previous = route[route.length - 2];
      const candidates = [...corners[current].neighbors].filter((id) => !visited.has(id));
      if (!candidates.length) break;
      const incoming =
        previous === undefined
          ? random() * TAU
          : Math.atan2(
              corners[current].point[1] - corners[previous].point[1],
              corners[current].point[0] - corners[previous].point[0],
            );
      let best: number | undefined,
        bestScore = Infinity;
      for (const id of candidates) {
        const angle = Math.atan2(
          corners[id].point[1] - corners[current].point[1],
          corners[id].point[0] - corners[current].point[0],
        );
        const turn = Math.atan2(Math.sin(angle - incoming), Math.cos(angle - incoming));
        if (previous !== undefined && Math.abs(turn) > 2.35) continue;
        const score = Math.abs(turn) + (turn < 0 ? 0.2 : 0) + random() * 0.1;
        if (score < bestScore) {
          best = id;
          bestScore = score;
        }
      }
      if (best === undefined) break;
      routedEdges.add(edgeKey(current, best));
      route.push(best);
      visited.add(best);
      if (
        route.length > 5 &&
        corners[best].cells.some((index) => cells[index].site.weight > 1) &&
        random() < 0.32
      )
        break;
    }
    if (route.length > 1) routes.push(route);
  }

  for (const route of routes) {
    const endpoint = route[route.length - 1],
      previous = route[route.length - 2];
    const position = corners[endpoint].point,
      before = corners[previous].point;
    const tangent = Math.atan2(position[1] - before[1], position[0] - before[0]);
    let chosen = -1,
      bestScore = -Infinity;
    for (const index of corners[endpoint].cells) {
      const cell = cells[index];
      if (cell.flower || cell.area < 100) continue;
      const direction = Math.atan2(
        cell.site.point[1] - position[1],
        cell.site.point[0] - position[0],
      );
      const alignment = Math.cos(direction - tangent);
      const score = Math.sqrt(cell.area) * (1.1 + alignment * 0.4) * cell.site.weight;
      if (score > bestScore) {
        bestScore = score;
        chosen = index;
      }
    }
    if (chosen >= 0) {
      cells[chosen].flower = true;
      cells[chosen].attachment = position;
      cells[chosen].endpoint = endpoint;
    }
  }
  cells.forEach((cell) => {
    if (cell.site.weight > 1 && cell.area > 160) cell.flower = true;
    if (cell.flower && !cell.attachment) cell.attachment = corners[cell.corners[0]].point;
  });
  // Endpoint eligibility should not make every short route an equally loud flower.
  const eligible = cells
    .filter((cell) => cell.flower)
    .sort(
      (a, b) => b.area * (b.site.weight > 1 ? 1.25 : 1) - a.area * (a.site.weight > 1 ? 1.25 : 1),
    );
  const prominentCount = Math.max(1, Math.round(cells.length * 0.2));
  let smallFlowers = 0;
  eligible.forEach((cell, index) => {
    cell.prominent = index < prominentCount;
    cell.flower = cell.prominent;
    if (
      !cell.prominent &&
      cell.endpoint !== undefined &&
      smallFlowers < Math.max(2, Math.round(cells.length * 0.045)) &&
      random() < 0.3
    ) {
      cell.flower = true;
      smallFlowers++;
    }
  });
  return { cells, corners, routes, routedEdges };
}

function colorChannels(color: string): number[] {
  const normalized = /^#[0-9a-f]{6}$/i.test(color)
    ? color.slice(1)
    : /^#[0-9a-f]{3}$/i.test(color)
      ? color
          .slice(1)
          .split('')
          .map((char) => char + char)
          .join('')
      : '39473b';
  return [0, 2, 4].map((index) => parseInt(normalized.slice(index, index + 2), 16));
}

function blend(a: string, b: string, amount: number): string {
  const first = colorChannels(a),
    second = colorChannels(b);
  return (
    '#' +
    first
      .map((value, index) =>
        Math.round(value + (second[index] - value) * amount)
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  );
}

function smoothPath(points: Point[], tension = 0.15): string {
  if (points.length < 2) return '';
  let path = `M${p(points[0])}`;
  for (let i = 0; i < points.length - 1; i++) {
    const previous = points[Math.max(0, i - 1)],
      a = points[i],
      b = points[i + 1],
      after = points[Math.min(points.length - 1, i + 2)];
    const c1: Point = [
      a[0] + (b[0] - previous[0]) * tension,
      a[1] + (b[1] - previous[1]) * tension,
    ];
    const c2: Point = [b[0] - (after[0] - a[0]) * tension, b[1] - (after[1] - a[1]) * tension];
    path += `C${p(c1)} ${p(c2)} ${p(b)}`;
  }
  return path;
}

function rayLength(center: Point, angle: number, polygon: Point[], mask: ShapeMask): number {
  const vector: Point = [Math.cos(angle), Math.sin(angle)],
    far: Point = [center[0] + vector[0] * 1600, center[1] + vector[1] * 1600];
  let limit = 1600;
  for (let i = 0; i < polygon.length; i++) {
    const hit = intersection(center, far, polygon[i], polygon[(i + 1) % polygon.length]);
    if (hit) {
      const length = distance(center, hit);
      if (length > 0.01) limit = Math.min(limit, length);
    }
  }
  limit = Math.min(limit, 200);
  for (let length = 2; length < limit; length += 1.8) {
    if (!maskContains(mask, center[0] + vector[0] * length, center[1] + vector[1] * length))
      return Math.max(1, length - 1.8);
  }
  return limit;
}

type Paint = {
  ink: string;
  paper: string;
  accent: string;
  line: string;
  vein: string;
  stem: string;
  leaf: string;
  leafLight: string;
  flower: string;
  flowerLight: string;
  flowerLine: string;
};

function drawFlower(
  cell: Cell,
  mask: ShapeMask,
  paint: Paint,
  random: Random,
  scale: number,
): string {
  const middle = centroid(cell.polygon);
  let center = mix(cell.site.point, middle, 0.33);
  if (!maskContains(mask, center[0], center[1]) || !pointInConvex(center, cell.polygon))
    center = cell.site.point;
  const size = Math.sqrt(cell.area / Math.PI);
  const rotation = random() * TAU;
  const petals = cell.prominent ? 5 + Math.round(random() * 2) : 6 + Math.round(random() * 3);
  const parts: string[] = [];
  if (cell.attachment) {
    const attachment = cell.attachment,
      middleStem = mix(attachment, center, 0.55);
    parts.push(
      `<path d="M${p(attachment)}Q${f(middleStem[0] + size * 0.14)} ${f(middleStem[1] - size * 0.12)} ${p(center)}" fill="none" stroke="${paint.stem}" stroke-width="1.1"/>`,
    );
  }
  const core = Math.max(1.5, Math.min(size * (cell.prominent ? 0.13 : 0.17), 7.5));
  const lengths = Array.from(
    { length: petals },
    (_, i) =>
      rayLength(center, rotation + (i * TAU) / petals, cell.polygon, mask) *
      clamp(scale * 0.91, 0.5, 1.1),
  );
  for (let pass = 0; pass < (cell.prominent ? 1 : 2); pass++) {
    const count = pass ? Math.max(5, petals - 3) : petals;
    for (let i = 0; i < count; i++) {
      const angle = rotation + (i * TAU) / count + (pass ? Math.PI / count : 0);
      const length = pass
        ? Math.min(size * 0.57, rayLength(center, angle, cell.polygon, mask) * 0.54) * scale
        : lengths[i];
      if (length < core * 1.25) continue;
      const ux = Math.cos(angle),
        uy = Math.sin(angle),
        nx = -uy,
        ny = ux;
      const width =
        Math.min(
          length * (cell.prominent ? 0.86 : 0.59),
          size * (cell.prominent ? 0.89 : pass ? 0.39 : 0.55),
        ) *
        (0.85 + random() * 0.24);
      const at = (along: number, across: number): Point => [
        center[0] + ux * along + nx * across,
        center[1] + uy * along + ny * across,
      ];
      const root = at(core * 0.42, 0),
        tip = at(length, 0);
      const fill = cell.prominent
        ? i % 3
          ? paint.flower
          : paint.flowerLight
        : pass
          ? blend(paint.accent, paint.paper, 0.76)
          : blend(paint.accent, paint.paper, 0.89);
      const path = `M${p(root)}C${p(at(length * 0.38, width * 0.85))} ${p(at(length * 0.98, width * 0.75))} ${p(tip)}C${p(at(length * 1.04, -width * 0.68))} ${p(at(length * 0.3, -width * 0.85))} ${p(root)}Z`;
      parts.push(
        `<path d="${path}" fill="${fill}" stroke="${paint.flowerLine}" stroke-width="${pass ? 0.54 : 0.68}"/>`,
      );
      for (const offset of cell.prominent
        ? [-0.52, -0.34, -0.17, 0, 0.17, 0.34, 0.52]
        : [-0.3, 0, 0.3]) {
        parts.push(
          `<path d="M${p(at(core * 0.8, 0))}Q${p(at(length * 0.45, width * offset * 1.12))} ${p(at(length * (offset ? 0.77 : 0.87), width * offset * 0.56))}" fill="none" stroke="${paint.flowerLine}" stroke-opacity="0.38" stroke-width="0.4"/>`,
        );
      }
    }
  }
  parts.push(
    `<circle cx="${f(center[0])}" cy="${f(center[1])}" r="${f(core)}" fill="${blend(paint.accent, paint.paper, 0.25)}" stroke="${paint.flowerLine}" stroke-width="0.7"/>`,
  );
  const stamens = Math.max(7, Math.round(core * 2));
  for (let i = 0; i < stamens; i++) {
    const angle = (i / stamens) * TAU,
      radius = core * (0.32 + random() * 0.55);
    parts.push(
      `<circle cx="${f(center[0] + Math.cos(angle) * radius)}" cy="${f(center[1] + Math.sin(angle) * radius)}" r="${f(Math.max(0.45, core * 0.09))}" fill="${paint.ink}" fill-opacity="0.76"/>`,
    );
  }
  return parts.join('');
}

function drawLeaf(cell: Cell, layout: Layout, paint: Paint, random: Random): string {
  let bestBase: Point | undefined,
    bestTip: Point | undefined,
    bestScore = -1;
  cell.corners.forEach((id, i) => {
    const next = cell.corners[(i + 1) % cell.corners.length];
    if (!layout.routedEdges.has(edgeKey(id, next))) return;
    const a = layout.corners[id].point,
      b = layout.corners[next].point,
      base = mix(a, b, 0.5);
    for (const point of cell.polygon) {
      const height = Math.abs(cross(a, b, point)) / (distance(a, b) || 1);
      if (height > bestScore) {
        bestScore = height;
        bestBase = base;
        bestTip = point;
      }
    }
  });
  if (!bestBase || !bestTip) {
    // Unassigned cells become a detached leaf/petal, rather than an invented vine crossing.
    for (const a of cell.polygon)
      for (const b of cell.polygon) {
        const length = distance(a, b);
        if (length > bestScore) {
          bestScore = length;
          bestBase = mix(a, cell.site.point, 0.16);
          bestTip = b;
        }
      }
  }
  if (!bestBase || !bestTip) return '';
  const base = mix(bestBase, cell.site.point, 0.06),
    tip = mix(bestTip, cell.site.point, 0.11);
  const length = distance(base, tip);
  if (length < 2) return '';
  const ux = (tip[0] - base[0]) / length,
    uy = (tip[1] - base[1]) / length,
    nx = -uy,
    ny = ux;
  const width = Math.min(Math.sqrt(cell.area) * 0.52, length * 0.46);
  const curve = (random() - 0.5) * width * 0.55;
  const at = (along: number, across: number): Point => [
    base[0] + ux * along + nx * across,
    base[1] + uy * along + ny * across,
  ];
  const leaf = `M${p(base)}C${p(at(length * 0.2, width + curve))} ${p(at(length * 0.74, width * 0.68 + curve))} ${p(tip)}C${p(at(length * 0.68, -width * 0.58 + curve))} ${p(at(length * 0.16, -width * 0.86 + curve))} ${p(base)}Z`;
  const fill = random() < 0.35 ? paint.leafLight : paint.leaf;
  const parts = [`<path d="${leaf}" fill="${fill}" stroke="${paint.line}" stroke-width="0.7"/>`];
  parts.push(
    `<path d="M${p(base)}Q${p(at(length * 0.53, curve * 1.5))} ${p(tip)}" fill="none" stroke="${paint.vein}" stroke-width="0.78"/>`,
  );
  const veins = Math.round(clamp(length / 7.5, 4, 10));
  for (let i = 1; i <= veins; i++) {
    const t = i / (veins + 1),
      middle = at(length * t, Math.sin(Math.PI * t) * curve * 0.75);
    const spread = Math.sin(Math.PI * t) * width * (0.57 + 0.1 * Math.cos(t * Math.PI));
    for (const side of [-1, 1]) {
      const end = at(
        length * Math.min(0.94, t + 0.12),
        Math.sin(Math.PI * t) * curve + side * spread,
      );
      const control = at(
        length * (t + 0.085),
        Math.sin(Math.PI * t) * curve + side * spread * 0.32,
      );
      parts.push(
        `<path d="M${p(middle)}Q${p(control)} ${p(end)}" fill="none" stroke="${paint.vein}" stroke-opacity="0.68" stroke-width="0.42"/>`,
      );
    }
  }
  // A short folded edge adds structure without adding a second competing motif.
  parts.push(
    `<path d="M${p(at(length * 0.12, -width * 0.11))}Q${p(at(length * 0.32, -width * 0.4))} ${p(at(length * 0.55, -width * 0.3))}" fill="none" stroke="${paint.paper}" stroke-opacity="0.65" stroke-width="0.7"/>`,
  );
  return parts.join('');
}

export function generateShapePattern(options: ShapePatternOptions): ShapePatternResult {
  const started = performance.now();
  const { width, height, mask } = options;
  if (mask.width !== width || mask.height !== height)
    throw new Error('The shape and artwork dimensions must match.');
  if (!mask.path || !mask.data.length || mask.area < 32)
    throw new Error('Select a region before generating a pattern.');
  const density = Math.round(
    clamp(Number.isFinite(options.density) ? options.density : 180, 60, 260),
  );
  const flowerScale = clamp(
    Number.isFinite(options.flowerScale) ? options.flowerScale! : 1,
    0.65,
    1.5,
  );
  const random = randomStream(`${SHAPE_ENGINE_VERSION}:${options.seed}:layout`);
  const sites = sample(mask, density, random);
  const layout = layoutCells(sites, mask, random);
  if (!layout.cells.length)
    throw new Error('The selected region has no usable cells. Try a larger shape.');
  const validColor = (color: string, fallback: string) =>
    /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(color) ? color : fallback;
  const ink = validColor(options.palette.ink, '#39473b'),
    accent = validColor(options.palette.accent, '#d59278'),
    paper = validColor(options.palette.paper, '#fffdf8');
  const paint: Paint = {
    ink,
    accent,
    paper,
    line: blend(ink, paper, 0.06),
    vein: blend(ink, paper, 0.54),
    stem: blend(ink, paper, 0.12),
    leaf: blend(ink, paper, 0.04),
    leafLight: blend(ink, paper, 0.23),
    flower: blend(accent, paper, 0.08),
    flowerLight: blend(accent, paper, 0.26),
    flowerLine: blend(accent, ink, 0.43),
  };
  const definitions: string[] = [
    `<clipPath id="shape-region"><path d="${mask.path}" clip-rule="evenodd"/></clipPath>`,
  ];
  const ornament: string[] = [],
    vines: string[] = [];
  layout.routes.forEach((route) => {
    const path = smoothPath(route.map((id) => layout.corners[id].point));
    vines.push(
      `<path d="${path}" fill="none" stroke="${paint.stem}" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"/>`,
    );
  });
  let flowers = 0,
    leaves = 0;
  layout.cells.forEach((cell, index) => {
    const center = cell.site.point;
    const inset = cell.polygon.map((point) => mix(center, point, 0.95));
    definitions.push(
      `<clipPath id="shape-cell-${index}"><path d="M${inset.map(p).join('L')}Z"/></clipPath>`,
    );
    const detail = randomStream(`${SHAPE_ENGINE_VERSION}:${options.seed}:motif:${index}`);
    const content = cell.flower
      ? drawFlower(cell, mask, paint, detail, flowerScale)
      : drawLeaf(cell, layout, paint, detail);
    if (cell.flower) flowers++;
    else leaves++;
    ornament.push(
      `<g clip-path="url(#shape-cell-${index})" data-element="${cell.flower ? 'flower' : 'leaf'}">${content}</g>`,
    );
  });
  const overlay = options.showCells
    ? `<g fill="none" stroke="${accent}" stroke-width="0.9" stroke-dasharray="3 3" opacity="0.8">${layout.cells.map((cell) => `<path d="M${cell.polygon.map(p).join('L')}Z"/>`).join('')}</g><g fill="${ink}">${sites.map((site) => `<circle cx="${f(site.point[0])}" cy="${f(site.point[1])}" r="${site.weight > 1 ? 2.8 : 1.7}"/>`).join('')}</g>`
    : '';
  const metadata = escapeXml(
    JSON.stringify({
      algorithm: SHAPE_ENGINE_VERSION,
      seed: options.seed,
      width,
      height,
      density,
      flowerScale,
      palette: { ink, accent, paper },
      containment: 'Approximate hull layout; vector silhouette and per-cell clipping.',
    }),
  );
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Procedural botanical ornament inside a selected shape"><title>Floral shape · seed ${escapeXml(String(options.seed))}</title><desc>Independent experiment after Lingdong Huang. Weighted samples, Voronoi cells, relaxed corner routes, flowers and leaves. Boundary clipping is approximate.</desc><metadata>${metadata}</metadata><defs>${definitions.join('')}</defs><rect width="${width}" height="${height}" fill="${paper}"/><g clip-path="url(#shape-region)">${vines.join('')}${ornament.join('')}${overlay}</g></svg>`;
  return {
    svg,
    version: SHAPE_ENGINE_VERSION,
    stats: {
      cells: layout.cells.length,
      flowers,
      leaves,
      vines: layout.routes.length,
      generationMs: Math.round(performance.now() - started),
    },
  };
}
