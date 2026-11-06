import { resolve } from 'node:path';
import { afterAll, beforeAll, expect, test } from 'vitest';
import { LuaFactory, type LuaEngine } from 'wasmoon';
import { continuousDomainLua } from './page-domain';
import type { PageSettings } from './page-types';

let lua: LuaEngine;
const settings: PageSettings = {
  version: 1, seed: 7, rect: { x: 58, y: 58, width: 100, height: 181 },
  ink: '#264b39', accent: '#b05d47', paper: '#fffdf8', density: 0.55,
  season: 'summer', visitors: [],
};

beforeAll(async () => {
  lua = await new LuaFactory(resolve('node_modules/wasmoon/dist/glue.wasm')).createEngine();
});
afterAll(() => lua?.global.close());

test.each([
  settings.rect,
  { x: 18, y: 18, width: 174, height: 261 },
  { x: 18, y: 18, width: 40, height: 40 },
  { x: 152, y: 239, width: 40, height: 40 },
])('continuous A4 scaffold keeps all three roots and routes outside $x/$y/$width/$height', async (rect) => {
  const result = await lua.doString(`
    local grow, flora = { regions = function() end }, { branch_path = function() end }
    ${continuousDomainLua({ ...settings, rect })}
    local g = {}
    configure(g)
    assert(g.stem_count == 3 and g.mirror == false and g.spill == 0)
    local draws = 0
    local regions, col, foot, spill, fx1 = grow.regions(g, { range = function() draws = draws + 1 return 0.5 end })
    assert(draws == 1 and #regions == 4 and regions.corners and not spill and fx1 == 20.7)
    assert(col[3] < g.textleft and foot[3] == 20.7)
    for k = 1, 3 do
      local points = g.stem_path({ { 1.2, 0.75 }, { 1.25, 1 } }, k, g)
      assert(#points > 100 and points[1][1] == 1.2 and points[1][2] == 0.75)
      assert(domain_path_clear(points), 'scaffold enters exclusion')
      assert(points[#points][2] > points[#points - 2][2], 'terminal is not upright')
      assert(points[#points][2] > 20, 'terminal is below species height assumptions')
    end
    local target, lower, upper = g.terminal_limit(1.2, 27, 1.5, 0.9, 1.6)
    assert(target <= 1.5 and lower <= upper and target > 0)
    return true
  `);
  lua.global.setTop(0);
  expect(result).toBe(true);
});

test('obstacle routing retains native safe curves, consumes one native draw, and restores hooks', async () => {
  const result = await lua.doString(`
    local calls = 0
    local grow = { regions = function() end }
    local flora = { branch_path = function(_, sx, sy, _, _, bx, by)
      calls = calls + 1
      return { { sx, sy }, { (sx + bx) / 2, (sy + by) / 2 }, { bx, by } }
    end }
    local old_regions, old_branch = grow.regions, flora.branch_path
    ${continuousDomainLua(settings)}
    configure({})
    local safe = flora.branch_path({}, 1, 1, 0, 1, 2, 20, 0, 1)
    assert(#safe == 3 and calls == 1)
    for _, pair in ipairs({
      { { 2, 15 }, { 18, 15 } },
      { { 10, 2 }, { 10, 28 } },
      { { 2, 20 }, { 18, 2 } }
    }) do
      local a, b = pair[1], pair[2]
      local route = flora.branch_path({}, a[1], a[2], 0, 1, b[1], b[2], 0, 1)
      assert(domain_path_clear(route), 'routed branch intersects the reserved rectangle')
      assert(route[1][1] == a[1] and route[1][2] == a[2])
      assert(math.abs(route[#route][1] - b[1]) < 1e-9 and math.abs(route[#route][2] - b[2]) < 1e-9)
    end
    assert(calls == 4)
    restore_domain()
    assert(grow.regions == old_regions and flora.branch_path == old_branch)
    return true
  `);
  lua.global.setTop(0);
  expect(result).toBe(true);
});
