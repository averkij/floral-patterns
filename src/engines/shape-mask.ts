/** Browser-side masks. The traced contours make text exports independent of installed fonts. */
export type Point = [number, number];
export type ShapeKind = 'circle' | 'arch' | 'heart' | 'text' | 'custom';

export interface ShapeMaskOptions {
  width: number;
  height: number;
  kind: ShapeKind;
  text?: string;
  fontFamily?: string;
  points?: Point[];
}

export interface ShapeMask {
  width: number;
  height: number;
  rasterWidth: number;
  rasterHeight: number;
  data: Uint8Array;
  path: string;
  contours: Point[][];
  area: number;
  bounds: [number, number, number, number];
}

const fmt = (value: number) => Number(value.toFixed(2)).toString();

function polygonArea(points: Point[]) {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i],
      b = points[(i + 1) % points.length];
    area += a[0] * b[1] - b[0] * a[1];
  }
  return area / 2;
}

function distanceToSegmentSquared(point: Point, start: Point, end: Point) {
  const dx = end[0] - start[0],
    dy = end[1] - start[1];
  const t = Math.max(
    0,
    Math.min(
      1,
      ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / (dx * dx + dy * dy || 1),
    ),
  );
  return (point[0] - start[0] - t * dx) ** 2 + (point[1] - start[1] - t * dy) ** 2;
}

/** Iterative Douglas–Peucker avoids recursion limits for long hand-drawn boundaries. */
function simplify(points: Point[], tolerance: number): Point[] {
  if (points.length < 5) return points;
  const closed = [...points, points[0]];
  const keep = new Uint8Array(closed.length);
  keep[0] = keep[closed.length - 1] = 1;
  const work: [number, number][] = [[0, closed.length - 1]];
  while (work.length) {
    const [start, end] = work.pop()!;
    let maximum = tolerance * tolerance,
      chosen = -1;
    for (let i = start + 1; i < end; i++) {
      const distance = distanceToSegmentSquared(closed[i], closed[start], closed[end]);
      if (distance > maximum) {
        maximum = distance;
        chosen = i;
      }
    }
    if (chosen >= 0) {
      keep[chosen] = 1;
      work.push([start, chosen], [chosen, end]);
    }
  }
  return closed.filter((_, i) => keep[i] && i !== closed.length - 1);
}

/** Trace directed edges of the occupied pixels, retaining counters and disconnected islands. */
function traceContours(
  data: Uint8Array,
  width: number,
  height: number,
  scaleX: number,
  scaleY: number,
): Point[][] {
  const edges = new Map<number, number[]>();
  const stride = width + 1;
  const add = (a: number, b: number) => {
    const outgoing = edges.get(a);
    if (outgoing) outgoing.push(b);
    else edges.set(a, [b]);
  };
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!data[y * width + x]) continue;
      const topLeft = y * stride + x;
      if (y === 0 || !data[(y - 1) * width + x]) add(topLeft, topLeft + 1);
      if (x === width - 1 || !data[y * width + x + 1]) add(topLeft + 1, topLeft + stride + 1);
      if (y === height - 1 || !data[(y + 1) * width + x])
        add(topLeft + stride + 1, topLeft + stride);
      if (x === 0 || !data[y * width + x - 1]) add(topLeft + stride, topLeft);
    }
  }
  const contours: Point[][] = [];
  const direction = (a: number, b: number) =>
    b === a + 1 ? 0 : b === a + stride ? 1 : b === a - 1 ? 2 : 3;
  const totalEdges = [...edges.values()].reduce((sum, outgoing) => sum + outgoing.length, 0);
  let remaining = totalEdges;
  while (edges.size && remaining > 0) {
    const start = edges.keys().next().value as number;
    let current = start,
      previousDirection = -1;
    const loop: Point[] = [];
    do {
      loop.push([(current % stride) * scaleX, Math.floor(current / stride) * scaleY]);
      const outgoing = edges.get(current);
      if (!outgoing?.length) break;
      let choice = 0;
      if (outgoing.length > 1 && previousDirection >= 0) {
        let bestRank = 5;
        outgoing.forEach((next, index) => {
          const turn = (direction(current, next) - previousDirection + 4) % 4;
          const rank = [1, 0, 3, 2][turn];
          if (rank < bestRank) {
            bestRank = rank;
            choice = index;
          }
        });
      }
      const next = outgoing.splice(choice, 1)[0];
      previousDirection = direction(current, next);
      if (!outgoing.length) edges.delete(current);
      current = next;
      remaining--;
    } while (current !== start && loop.length <= totalEdges);
    if (
      current === start &&
      loop.length >= 4 &&
      Math.abs(polygonArea(loop)) > scaleX * scaleY * 3
    ) {
      const reduced = simplify(loop, Math.min(scaleX, scaleY) * 0.65);
      if (reduced.length >= 3) contours.push(reduced);
    }
  }
  return contours;
}

export function maskContains(mask: ShapeMask, x: number, y: number): boolean {
  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    x < 0 ||
    y < 0 ||
    x >= mask.width ||
    y >= mask.height
  )
    return false;
  const rx = Math.floor((x / mask.width) * mask.rasterWidth);
  const ry = Math.floor((y / mask.height) * mask.rasterHeight);
  return mask.data[ry * mask.rasterWidth + rx] !== 0;
}

/** Call after document.fonts.ready when using a loaded web font. */
export function createShapeMask(options: ShapeMaskOptions): ShapeMask {
  const { width, height, kind } = options;
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width < 16 ||
    height < 16 ||
    width > 4096 ||
    height > 4096
  ) {
    throw new Error('Choose a canvas size between 16 and 4096 pixels.');
  }
  const scale = Math.min(1, 720 / Math.max(width, height));
  const rasterWidth = Math.ceil(width * scale),
    rasterHeight = Math.ceil(height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = rasterWidth;
  canvas.height = rasterHeight;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Your browser could not create a drawing canvas.');
  context.scale(rasterWidth / width, rasterHeight / height);
  context.fillStyle = '#000';
  let exactPath = '';
  if (kind === 'text') {
    const text = [...(options.text ?? 'R').trim()].slice(0, 8).join('');
    if (!text) throw new Error('Enter a letter or a short word to grow the pattern.');
    const family = options.fontFamily || '"Floralia Serif", Georgia, serif';
    const weight = /sans|arial/i.test(family) ? '900' : '400';
    let fontSize = height * 0.95;
    context.font = `${weight} ${fontSize}px ${family}`;
    const initial = context.measureText(text);
    fontSize *= Math.min(
      (width * 0.82) / Math.max(initial.width, 1),
      (height * 0.82) /
        Math.max(initial.actualBoundingBoxAscent + initial.actualBoundingBoxDescent, 1),
    );
    context.font = `${weight} ${fontSize}px ${family}`;
    const metrics = context.measureText(text);
    context.textAlign = 'center';
    context.textBaseline = 'alphabetic';
    context.fillText(
      text,
      width / 2,
      (height + metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2,
    );
  } else {
    const sx = width / 800,
      sy = height / 800;
    const p = (x: number, y: number) => `${fmt(x * sx)} ${fmt(y * sy)}`;
    if (kind === 'circle') {
      exactPath = `M${p(400, 64)}A${fmt(336 * sx)} ${fmt(336 * sy)} 0 1 1 ${p(399.99, 64)}Z`;
    } else if (kind === 'arch') {
      exactPath = `M${p(130, 716)}L${p(130, 354)}A${fmt(270 * sx)} ${fmt(270 * sy)} 0 0 1 ${p(670, 354)}L${p(670, 716)}Z`;
    } else if (kind === 'heart') {
      exactPath = `M${p(400, 716)}C${p(316, 634)} ${p(75, 467)} ${p(75, 268)}C${p(75, 74)} ${p(307, 44)} ${p(400, 218)}C${p(493, 44)} ${p(725, 74)} ${p(725, 268)}C${p(725, 467)} ${p(484, 634)} ${p(400, 716)}Z`;
    } else {
      const points = (options.points ?? [])
        .filter((point) => point.length === 2 && point.every(Number.isFinite))
        .slice(0, 2000);
      if (points.length < 3) throw new Error('Draw a closed region with at least three points.');
      exactPath =
        points
          .map(
            (point, index) =>
              `${index ? 'L' : 'M'}${fmt(Math.max(0, Math.min(width, point[0])))} ${fmt(Math.max(0, Math.min(height, point[1])))}`,
          )
          .join('') + 'Z';
    }
    context.fill(new Path2D(exactPath), 'evenodd');
  }
  const rgba = context.getImageData(0, 0, rasterWidth, rasterHeight).data;
  const data = new Uint8Array(rasterWidth * rasterHeight);
  let count = 0,
    minX = rasterWidth,
    minY = rasterHeight,
    maxX = 0,
    maxY = 0;
  for (let y = 0; y < rasterHeight; y++) {
    for (let x = 0; x < rasterWidth; x++) {
      const index = y * rasterWidth + x;
      if (rgba[index * 4 + 3] < 128) continue;
      data[index] = 1;
      count++;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x + 1);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y + 1);
    }
  }
  if (count < 32) throw new Error('This region is too small to fill. Draw a larger shape.');
  const scaleX = width / rasterWidth,
    scaleY = height / rasterHeight;
  const contours = traceContours(data, rasterWidth, rasterHeight, scaleX, scaleY);
  const tracedPath = contours
    .map(
      (contour) =>
        contour.map((point, i) => `${i ? 'L' : 'M'}${fmt(point[0])} ${fmt(point[1])}`).join('') +
        'Z',
    )
    .join('');
  return {
    width,
    height,
    rasterWidth,
    rasterHeight,
    data,
    contours,
    path: kind === 'text' ? tracedPath : exactPath,
    area: count * scaleX * scaleY,
    bounds: [minX * scaleX, minY * scaleY, maxX * scaleX, maxY * scaleY],
  };
}
