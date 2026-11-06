import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { afterAll, beforeAll, expect, test } from 'vitest';
import { LuaFactory } from 'wasmoon';
import type { LuaEngine } from 'wasmoon';
import {
  composePage,
  LUA_MODULES,
  pagePanels,
  panelLua,
  validatePageSettings,
} from './page-adapter';
import type { PanelResult } from './page-adapter';
import type { PageSettings } from './page-types';

const settings: PageSettings = {
  version: 1,
  seed: 7,
  rect: { x: 58, y: 58, width: 100, height: 181 },
  ink: '#264b39',
  accent: '#b05d47',
  paper: '#fffdf8',
  density: 0.55,
  season: 'summer',
  visitors: [],
};
let lua: LuaEngine;

beforeAll(async () => {
  const factory = new LuaFactory(resolve('node_modules/wasmoon/dist/glue.wasm'));
  await Promise.all(
    LUA_MODULES.map(async (name) => {
      await factory.mountFile(
        `/florilegium/${name}.lua`,
        await readFile(resolve('florilegium', `${name}.lua`), 'utf8'),
      );
    }),
  );
  lua = await factory.createEngine();
  await lua.doString('package.path = "/florilegium/?.lua;" .. package.path');
  lua.global.setTop(0);
}, 30_000);

afterAll(() => lua?.global.close());

test('the actual upstream Lua produces a reproducible four-margin A4 composition', async () => {
  validatePageSettings(settings);
  const panels = pagePanels(settings);
  const results: PanelResult[] = [];
  for (const panel of panels) {
    results.push((await lua.doString(panelLua(settings, panel))) as PanelResult);
    lua.global.setTop(0);
  }
  const duplicate = (await lua.doString(panelLua(settings, panels[0]))) as PanelResult;
  lua.global.setTop(0);
  expect(duplicate.svg).toBe(results[0].svg);
  const page = composePage(settings, panels, results, 0);
  expect(page.svg).toContain('width="210mm" height="297mm" viewBox="0 0 210 297"');
  expect(page.svg.match(/data-panel=/g)).toHaveLength(4);
  expect(page.svg).toContain('fill="#fffdf8"');
  expect(page.svg).not.toMatch(/NaN|Infinity|undefined/);
  expect(page.stats.motifs).toBeGreaterThan(0);
  expect(page.stats.visitors).toEqual([]);
  expect(page.revision).toBe('9fbaf56d53e6525e02da05cd802ea7da82052099');
}, 90_000);

test('invalid rectangles and unsafe settings are rejected before Lua execution', () => {
  expect(() => validatePageSettings({ ...settings, rect: { ...settings.rect, x: 0 } })).toThrow(
    /18 mm/,
  );
  expect(() => validatePageSettings({ ...settings, ink: 'red\";error(1)' })).toThrow(/hexadecimal/);
  expect(() => validatePageSettings({ ...settings, seed: Number.NaN })).toThrow(/seed/);
});

test('the smallest supported panel terminates, and visitor selection remains selective', async () => {
  const narrow: PageSettings = {
    ...settings,
    rect: { x: 18, y: 18, width: 40, height: 40 },
    visitors: ['bee'],
  };
  validatePageSettings(narrow);
  const panel = pagePanels(narrow)[2];
  const result = (await lua.doString(panelLua(narrow, panel))) as PanelResult;
  lua.global.setTop(0);
  expect(result.svg).toContain('<path ');
  expect(result.svg).not.toMatch(/NaN|Infinity/);
  expect(
    Object.values(result.stats?.visitors ?? {}).every((visitor) => visitor.group === 'bee'),
  ).toBe(true);
}, 30_000);

const frameCases = [
  { name: 'default', rect: { x: 56, y: 52, width: 108, height: 189 } },
  { name: 'maximum reserved area', rect: { x: 18, y: 18, width: 174, height: 261 } },
];

test.each(frameCases)(
  '$name: clipping panels exactly partition the space outside the rectangle',
  async ({ rect }) => {
    const input = { ...settings, rect };
    validatePageSettings(input);
    const panels = pagePanels(input);
    const bounds = panels.map((panel) => {
      const translation = /translate\(([^ ]+) ([^)]+)\)/.exec(panel.transform);
      const rotation = /rotate\(([^)]+)\)/.exec(panel.transform);
      const angle = (Number(rotation?.[1] ?? 0) * Math.PI) / 180;
      const tx = Number(translation?.[1] ?? 0),
        ty = Number(translation?.[2] ?? 0);
      const corners = [
        [0, 0],
        [panel.width, 0],
        [0, panel.length],
        [panel.width, panel.length],
      ].map(([x, y]) => [
        tx + x * Math.cos(angle) - y * Math.sin(angle),
        ty + x * Math.sin(angle) + y * Math.cos(angle),
      ]);
      return {
        left: Math.min(...corners.map(([x]) => x)),
        top: Math.min(...corners.map(([, y]) => y)),
        right: Math.max(...corners.map(([x]) => x)),
        bottom: Math.max(...corners.map(([, y]) => y)),
      };
    });
    const overlap = (a: (typeof bounds)[number], b: (typeof bounds)[number]) =>
      Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
      Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    const reserved = {
      left: rect.x,
      top: rect.y,
      right: rect.x + rect.width,
      bottom: rect.y + rect.height,
    };
    let area = 0;
    bounds.forEach((bound, i) => {
      expect(bound.left).toBeGreaterThanOrEqual(-1e-8);
      expect(bound.top).toBeGreaterThanOrEqual(-1e-8);
      expect(bound.right).toBeLessThanOrEqual(210 + 1e-8);
      expect(bound.bottom).toBeLessThanOrEqual(297 + 1e-8);
      expect(overlap(bound, reserved)).toBeCloseTo(0);
      for (let j = 0; j < i; j++) expect(overlap(bound, bounds[j])).toBeCloseTo(0);
      area += (bound.right - bound.left) * (bound.bottom - bound.top);
    });
    expect(area).toBeCloseTo(210 * 297 - rect.width * rect.height);

    const outputs: PanelResult[] = [];
    for (const panel of panels) {
      outputs.push((await lua.doString(panelLua(input, panel))) as PanelResult);
      lua.global.setTop(0);
    }
    const result = composePage(input, panels, outputs, 0);
    expect(result.svg.match(/overflow="hidden"/g)).toHaveLength(4);
    expect(result.svg).not.toMatch(/NaN|Infinity|undefined/);
    expect(result.stats.motifs).toBeGreaterThan(0);
  },
  90_000,
);

test('filtering to bees removes a known caterpillar without changing the plant layout', async () => {
  const input: PageSettings = {
    ...settings,
    rect: frameCases[0].rect,
    visitors: ['bee', 'caterpillar'],
  };
  const panel = pagePanels(input)[0];
  const all = (await lua.doString(panelLua(input, panel))) as PanelResult;
  lua.global.setTop(0);
  const bees = (await lua.doString(
    panelLua({ ...input, visitors: ['bee'] }, panel),
  )) as PanelResult;
  lua.global.setTop(0);
  expect(
    Object.values(all.stats?.visitors ?? {})
      .map((visitor) => visitor.group)
      .sort(),
  ).toEqual(['bee', 'larva']);
  expect(Object.values(bees.stats?.visitors ?? {}).map((visitor) => visitor.group)).toEqual([
    'bee',
  ]);
  expect(bees.stats?.motifs).toBe(all.stats?.motifs);
  expect(bees.stats?.stems).toBe(all.stats?.stems);
  expect(bees.svg.length).toBeLessThan(all.svg.length);
}, 30_000);
