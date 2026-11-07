import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { afterAll, beforeAll, expect, test } from 'vitest';
import { LuaFactory, type LuaEngine } from 'wasmoon';
import { composeContinuousPage, continuousPageLua, LUA_MODULES, validatePageSettings } from './page-adapter';
import type { ContinuousResult } from './page-adapter';
import { adaptGrowSource } from './page-lua';
import { continuousDomainLua } from './page-domain';
import type { PageSettings } from './page-types';
import { FLOWERS, defaultFlowerColors } from '../flowers';

const settings: PageSettings = {
  version: 1, seed: 7, rect: { x: 56, y: 52, width: 108, height: 189 },
  ink: '#264b39', accent: '#b05d47', paper: '#fffdf8', density: 0.55,
  season: 'summer', visitors: [],
};
let lua: LuaEngine;

beforeAll(async () => {
  const factory = new LuaFactory(resolve('node_modules/wasmoon/dist/glue.wasm'));
  for (const name of LUA_MODULES) {
    const source = await readFile(resolve('florilegium', `${name}.lua`), 'utf8');
    await factory.mountFile(`/florilegium/${name}.lua`, name === 'florilegium-grow' ? adaptGrowSource(source) : source);
  }
  lua = await factory.createEngine();
  await lua.doString('package.path = "/florilegium/?.lua;" .. package.path');
  lua.global.setTop(0);
}, 30_000);
afterAll(() => lua?.global.close());

async function generate(input: PageSettings): Promise<ContinuousResult> {
  const raw = await lua.doString(continuousPageLua(input)) as ContinuousResult;
  lua.global.setTop(0);
  await lua.doString('collectgarbage("collect")');
  lua.global.setTop(0);
  return raw;
}

test('one native garden produces a compact, scheduled A4 scene and an identical static final', async () => {
  const raw = await generate(settings);
  const animated = composeContinuousPage(settings, raw, 0, true);
  const still = composeContinuousPage(settings, raw, 0, false);
  expect(animated.svg).toBe(still.svg);
  expect(animated.timeline?.svg).toBe(still.svg);
  expect(still.timeline).toBeUndefined();
  expect(still.svg).toContain('width="210mm" height="297mm"');
  expect(still.svg).toContain('fill="#fffdf8"');
  expect(still.svg.match(/<svg\b/g)).toHaveLength(1);
  expect(still.svg).not.toMatch(/data-panel|rotate\(90|NaN|Infinity|undefined/);
  expect(still.stats.motifs).toBeGreaterThan(0);
  expect(still.stats.visitors).toEqual([]);
  const events = animated.timeline!.events;
  expect(events.length).toBeGreaterThan(30);
  expect(raw.duration).toBeGreaterThan(1);
  for (const event of events) {
    expect([event.start, event.duration, event.x, event.y].every(Number.isFinite)).toBe(true);
    expect(event.start).toBeGreaterThanOrEqual(0);
    expect(event.duration).toBeGreaterThan(0);
    expect(event.start + event.duration).toBeLessThanOrEqual(raw.duration + 1e-8);
  }
  const roots = events.filter(event => event.kind === 'stem' && event.path).slice(0, 3);
  expect(roots).toHaveLength(3);
  expect(roots.every(event => event.path!.startsWith('M'))).toBe(true);
  expect(roots[1].path!.match(/L/g)!.length).toBeGreaterThan(100);
  const ids = new Set(events.map(event => event.id));
  for (const group of still.svg.matchAll(/data-growth-event="([^"]+)"/g)) expect(ids.has(group[1])).toBe(true);
  const duplicate = await generate(settings);
  expect(duplicate.body).toBe(raw.body);
  expect(duplicate.events).toEqual(raw.events);
  expect(duplicate.stats).toEqual(raw.stats);

  // A separate ordinary upstream draw proves compact recording does not alter
  // final plant geometry. Only the widened upstream boundary clip is excluded.
  const native = await lua.doString(`
    local grow, flora = require("florilegium-grow"), require("florilegium-flora")
    local drawer = require("florilegium-native")
    local original_page, original_draw = grow.page, drawer.draw
    ${continuousDomainLua(settings)}
    grow.page = function(g) configure(g) g.anim = false return original_page(g) end
    drawer.draw = function(kind, ...) if kind == "visitor" then return true end return original_draw(kind, ...) end
    local ok, svg = pcall(function()
      return require("florilegium-svg").page({ paper = "a4", left = "56mm", right = "46mm", top = "52mm", bottom = "56mm",
        footskip = "0mm", headsep = "0mm", headheight = "0mm", head = false, seed = 7,
        ink = "264b39", accent = "b05d47", density = 0.55, season = "summer", visitors = true })
    end)
    grow.page, drawer.draw = original_page, original_draw
    restore_domain()
    if not ok then error(svg) end
    return svg
  `) as string;
  lua.global.setTop(0);
  const paintedPaths = (svg: string) => svg.replace(/<clipPath\b[^>]*>[\s\S]*?<\/clipPath>/g, '').match(/<path\b[^>]*\/>/g);
  expect(paintedPaths(raw.body)).toEqual(paintedPaths(native));
}, 60_000);

test('maximum reservation stays valid and selective visitors preserve plant layout', async () => {
  const input: PageSettings = { ...settings, density: 0.2,
    rect: { x: 18, y: 18, width: 174, height: 261 }, visitors: ['bee', 'butterfly', 'bird', 'snail'] };
  validatePageSettings(input);
  const all = await generate(input);
  const bees = await generate({ ...input, visitors: ['bee'] });
  expect(all.stats.motifs).toBeGreaterThan(0);
  expect(Object.values(bees.stats.visitors ?? {}).every(visitor => visitor.group === 'bee')).toBe(true);
  expect(bees.stats.motifs).toBe(all.stats.motifs);
  expect(bees.stats.stems).toBe(all.stats.stems);
  const svg = composeContinuousPage(input, all, 0).svg;
  expect(svg).not.toMatch(/NaN|Infinity|undefined/);
  expect(svg.match(/id="garden-reservation"/g)).toHaveLength(1);
  expect(svg).toContain('clip-rule="evenodd"');
}, 60_000);

test('invalid settings and a changed upstream source fail explicitly', () => {
  expect(() => validatePageSettings({ ...settings, rect: { ...settings.rect, x: 0 } })).toThrow(/18 mm/);
  expect(() => validatePageSettings({ ...settings, ink: 'red";error(1)' })).toThrow(/hexadecimal/);
  expect(() => validatePageSettings({ ...settings, seed: Number.NaN })).toThrow(/seed/);
  expect(() => adaptGrowSource('-- wrong revision')).toThrow(/pinned Florilegium source/);
  expect(() => validatePageSettings({ ...settings, flowers: [] })).toThrow(/flower/);
  expect(() => validatePageSettings({ ...settings, flowerColors: { ...defaultFlowerColors, rose: 'red' } })).toThrow(/hexadecimal/);
});

test('all eight flower choices generate distinct blooms, recolor without moving paths, and restore hooks', async () => {
  const geometry = (body: string) => [...body.matchAll(/<path\b[^>]*\bd="([^"]*)"/g)].map(m => m[1]);
  const originals = await lua.doString(`local s,n=require('florilegium-species'),require('florilegium-native')
    saved_community,saved_bloom,saved_draw=s.community,n.bloom,n.draw return true`);
  expect(originals).toBe(true);
  lua.global.setTop(0);
  const signatures = new Set<string>();
  for (const flower of FLOWERS) {
    const input: PageSettings = { ...settings, density: .2, flowers: [flower.id], flowerColors: { ...defaultFlowerColors } };
    validatePageSettings(input);
    const raw = await generate(input);
    expect(raw.body).not.toMatch(/NaN|Infinity|undefined/);
    expect(raw.stats.motifs).toBeGreaterThan(0);
    signatures.add(JSON.stringify(geometry(raw.body)));
    const recolored = await generate({ ...input, flowerColors: { ...defaultFlowerColors, [flower.id]: '#19c7ba' } });
    expect(recolored.body).not.toBe(raw.body);
    expect(geometry(recolored.body)).toEqual(geometry(raw.body));
    expect(recolored.events).toEqual(raw.events);
    expect(recolored.stats).toEqual(raw.stats);
    expect(await lua.doString(`local s,n=require('florilegium-species'),require('florilegium-native')
      return s.community==saved_community and n.bloom==saved_bloom and n.draw==saved_draw`)).toBe(true);
    lua.global.setTop(0);
  }
  expect(signatures.size).toBe(8);
  const mixed = { ...settings, density: .2, flowers: FLOWERS.map(f => f.id), flowerColors: defaultFlowerColors };
  const first = await generate(mixed);
  expect((await generate(mixed)).body).toBe(first.body);
}, 120_000);
