import { describe, expect, it } from 'vitest';
import { generateShapePattern, type ShapePatternOptions } from './shape';
import { maskContains, type Point, type ShapeMask } from './shape-mask';
import { buildOrntxtScene, samplePath, cubicPoint, makePetal, naturalCubicBezier, pointInPolygon } from './shape-orntxt';

const palette = { ink: '#39473b', accent: '#d59278', paper: '#fffdf8' };

function maskFromContours(
  contours: Point[][],
  predicate: (x: number, y: number) => boolean,
): ShapeMask {
  const width = 400,
    height = 400,
    data = new Uint8Array(width * height);
  let area = 0;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      if (predicate(x + 0.5, y + 0.5)) {
        data[y * width + x] = 1;
        area++;
      }
    }
  return {
    width,
    height,
    rasterWidth: width,
    rasterHeight: height,
    data,
    area,
    bounds: [0, 0, width, height],
    contours,
    path: contours
      .map((points) => 'M' + points.map((point) => point.join(' ')).join('L') + 'Z')
      .join(''),
  };
}

const rectangle: Point[] = [
  [20, 20],
  [380, 20],
  [380, 380],
  [20, 380],
];
const solid = maskFromContours([rectangle], (x, y) => x > 20 && x < 380 && y > 20 && y < 380);
const options = (mask = solid): ShapePatternOptions => ({
  width: 400,
  height: 400,
  seed: 'specimen-42',
  density: 100,
  palette,
  mask,
});
const geometry = (svg: string) => [...svg.matchAll(/\sd="([^"]+)"/g)].map((match) => match[1]);

describe('orntxt source-derived generator', () => {
  it('reproduces vector geometry and changes layout with the seed', () => {
    const first = generateShapePattern(options());
    const second = generateShapePattern(options());
    const third = generateShapePattern({ ...options(), seed: 'specimen-43' });
    expect(first.svg).toBe(second.svg);
    expect(geometry(first.svg)).not.toEqual(geometry(third.svg));
    expect(first.stats.cells).toBe(100);
    expect(first.stats.flowers).toBeGreaterThan(5);
    expect(first.stats.leaves).toBeGreaterThan(10);
    expect(first.stats.vines).toBeGreaterThan(1);
  });

  it('keeps the composition fixed when changing the palette', () => {
    const first = generateShapePattern(options());
    const recolored = generateShapePattern({
      ...options(),
      palette: { ink: '#152c53', accent: '#cf976b', paper: '#fffffa' },
    });
    expect(geometry(recolored.svg)).toEqual(geometry(first.svg));
  });

  it('changes flower detail without moving the cell scaffold', () => {
    const small = buildOrntxtScene({ mask: solid, seed: 42, density: 100, flowerScale: 0.65 });
    const large = buildOrntxtScene({ mask: solid, seed: 42, density: 100, flowerScale: 1.5 });
    expect(small.cells).toEqual(large.cells);
    expect(small.sites).toEqual(large.sites);
    expect(small.motifs.filter(motif => motif.kind === 'leaf')).toEqual(large.motifs.filter(motif => motif.kind === 'leaf'));
    expect(small.motifs.filter(motif => motif.kind === 'flower')).not.toEqual(large.motifs.filter(motif => motif.kind === 'flower'));
    for (const motif of small.motifs.filter(motif => motif.kind === 'flower')) {
      const enlarged = large.motifs.find(candidate => candidate.kind === 'flower' && candidate.cell === motif.cell);
      expect(enlarged?.fitScale).toBeGreaterThanOrEqual(motif.fitScale);
    }
  });

  it('normalizes non-finite numeric controls at the engine boundary', () => {
    const fallback = generateShapePattern({ ...options(), density: 180, flowerScale: 1 });
    const invalid = generateShapePattern({ ...options(), density: NaN, flowerScale: NaN });
    expect(invalid.svg).toBe(fallback.svg);
  });

  it('fits complete motif curves around a counter without SVG clipping', () => {
    const hole: Point[] = [
      [130, 130],
      [270, 130],
      [270, 270],
      [130, 270],
    ];
    const ring = maskFromContours(
      [rectangle, hole],
      (x, y) =>
        x > 20 && x < 380 && y > 20 && y < 380 && !(x > 130 && x < 270 && y > 130 && y < 270),
    );
    const result = generateShapePattern(options(ring));
    expect(maskContains(ring, 200, 200)).toBe(false);
    expect(/clipPath|clip-path|<mask/.test(result.svg)).toBe(false);
    expect(/NaN|Infinity/.test(result.svg)).toBe(false);
    expect(result.stats.cells).toBe(100);
    const scene = buildOrntxtScene({ mask: ring, seed: 42, density: 100, flowerScale: 1.5 });
    expect(scene.motifs.length).toBeGreaterThan(50);
    const outside = scene.motifs.flatMap(motif => motif.paths.flatMap(path => samplePath(path, 64))).filter(point => !maskContains(ring, ...point));
    expect(outside.length).toBe(0);
    const outsideVines = scene.vines.flatMap(route => route.flatMap(curve => Array.from({ length: 64 }, (_, i) => cubicPoint(curve, i / 63)))).filter(point => !maskContains(ring, ...point));
    expect(outsideVines.length).toBe(0);
    expect(scene.motifs.every(motif => motif.paths.every(path => !path.closed || !pointInPolygon([200, 200], samplePath(path, 48))))).toBe(true);
  });

  it('terminates on disconnected regions and bounds excessive sample requests', () => {
    const left: Point[] = [
      [20, 40],
      [150, 40],
      [150, 360],
      [20, 360],
    ];
    const right: Point[] = [
      [250, 40],
      [380, 40],
      [380, 360],
      [250, 360],
    ];
    const islands = maskFromContours(
      [left, right],
      (x, y) => y > 40 && y < 360 && ((x > 20 && x < 150) || (x > 250 && x < 380)),
    );
    const result = generateShapePattern({ ...options(islands), density: 10000, showCells: true });
    expect(result.stats.cells).toBeLessThanOrEqual(260);
    expect(result.svg).toContain('stroke-dasharray="3 3"');
    expect(result.svg).not.toMatch(/NaN|Infinity/);
    const scene = buildOrntxtScene({ mask: islands, seed: 42, density: 100, flowerScale: 1 });
    expect(scene.sites.some(point => point[0] < 150)).toBe(true);
    expect(scene.sites.some(point => point[0] > 250)).toBe(true);
    expect(scene.motifs.flatMap(motif => motif.paths.flatMap(path => samplePath(path, 48))).every(point => maskContains(islands, ...point))).toBe(true);
    expect(scene.vines.flatMap(route => route.flatMap(curve => Array.from({ length: 48 }, (_, i) => cubicPoint(curve, i / 47)))).every(point => maskContains(islands, ...point))).toBe(true);
  });

  it('keeps whole motifs inside a deeply concave region at scale and density extremes', () => {
    const contour: Point[] = [[20, 20], [380, 20], [380, 120], [100, 120], [100, 280], [380, 280], [380, 380], [20, 380]];
    const concave = maskFromContours([contour], (x, y) => x > 20 && x < 380 && y > 20 && y < 380 && !(x > 100 && y > 120 && y < 280));
    for (const density of [60, 260]) {
      const scene = buildOrntxtScene({ mask: concave, seed: 197, density, flowerScale: 1.5 });
      expect(scene.motifs.length).toBeGreaterThan(density * 0.6);
      const points = scene.motifs.flatMap(motif => motif.paths.flatMap(path => samplePath(path, 64)));
      expect(points.every(point => maskContains(concave, ...point))).toBe(true);
    }
  });

  it('retains the upstream three-cubic petal construction and natural-cubic continuity', () => {
    const petal = makePetal([0, 0], [10, 0], [0, 2]);
    expect(petal.curves).toHaveLength(3);
    expect(petal.curves[0][1]).toEqual([3, 2.4]);
    expect(petal.curves[0][3]).toEqual([9, 0.6]);
    expect(petal.curves[2][3]).toEqual([0, 0]);
    const curves = naturalCubicBezier([[0, 0], [30, 50], [80, 20], [110, 70]]);
    for (let i = 0; i < curves.length - 1; i++) {
      expect(curves[i][3]).toEqual(curves[i + 1][0]);
      for (const axis of [0, 1]) expect(curves[i][3][axis] - curves[i][2][axis]).toBeCloseTo(curves[i + 1][1][axis] - curves[i + 1][0][axis], 8);
    }
  });

  it('rejects empty or unusably thin masks with a useful error', () => {
    const empty = maskFromContours([], () => false);
    expect(() => generateShapePattern(options(empty))).toThrow('Select a region');
    const thin = maskFromContours(
      [
        [
          [20, 199],
          [380, 199],
          [380, 200],
          [20, 200],
        ],
      ],
      (x, y) => x > 20 && x < 380 && y > 199 && y < 200,
    );
    expect(() => generateShapePattern(options(thin))).toThrow('too thin');
  });
});
