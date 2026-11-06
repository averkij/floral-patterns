import { describe, expect, it } from 'vitest';
import { generateShapePattern, type ShapePatternOptions } from './shape';
import { maskContains, type Point, type ShapeMask } from './shape-mask';

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

describe('independent shape generator', () => {
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
    const small = generateShapePattern({ ...options(), flowerScale: 0.65 });
    const large = generateShapePattern({ ...options(), flowerScale: 1.5 });
    const definitions = (svg: string) => svg.match(/<defs>(.*?)<\/defs>/)?.[1];
    expect(definitions(small.svg)).toBe(definitions(large.svg));
    expect(small.stats.cells).toBe(large.stats.cells);
    expect(small.stats.flowers).toBe(large.stats.flowers);
    expect(geometry(small.svg)).not.toEqual(geometry(large.svg));
    expect(large.svg).not.toMatch(/NaN|Infinity/);
  });

  it('normalizes non-finite numeric controls at the engine boundary', () => {
    const fallback = generateShapePattern({ ...options(), density: 180, flowerScale: 1 });
    const invalid = generateShapePattern({ ...options(), density: NaN, flowerScale: NaN });
    expect(invalid.svg).toBe(fallback.svg);
  });

  it('retains a counter as an even-odd vector silhouette', () => {
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
    expect(result.svg).toContain('clip-rule="evenodd"');
    expect(result.svg).toContain(ring.path);
    expect(result.svg).not.toMatch(/NaN|Infinity/);
    expect(result.stats.cells).toBe(100);
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
    const cellPaths = [
      ...result.svg.matchAll(/<clipPath id="shape-cell-\d+"><path d="([^"]+)"/g),
    ].map((match) => match[1]);
    const averageX = (path: string) => {
      const coordinates = path.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
      const xs = coordinates.filter((_, index) => index % 2 === 0);
      return xs.reduce((sum, x) => sum + x, 0) / xs.length;
    };
    expect(cellPaths.some((path) => averageX(path) < 150)).toBe(true);
    expect(cellPaths.some((path) => averageX(path) > 250)).toBe(true);
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
