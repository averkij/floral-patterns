import { FLOWERS, defaultFlowerColors } from '../flowers';
import type { PageSettings } from './page-types';

/** Our illustrated motifs, drawn in upstream ink coordinates (diameter one).
 * Species sampling still supplies foliage and seasonal buds/fruit. No vendor edits.
 */
export function flowersLua(settings: PageSettings): string {
  if (!settings.flowers) return 'local function restore_flowers() end';
  const selected = FLOWERS.filter(f => settings.flowers!.includes(f.id));
  const definitions = selected.map(f => {
    const hex = (settings.flowersMatchInk ? settings.ink : settings.flowerColors?.[f.id] ?? defaultFlowerColors[f.id]).replace('#', '');
    const rgb = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
    return `{ id = "${f.id}", plan = "${f.plan}", rgb = {${rgb.join(',')}} }`;
  }).join(',\n');
  return String.raw`
    local ink = require("florilegium-ink")
    local choices = { ${definitions} }
    local old_community, old_bloom = species.community, native.bloom
    local current_flower, detail_rng
    species.community = function(pool, rng)
      local original = old_community(pool, rng) -- retain the layout stream's draws
      local order = {}
      for i, choice in ipairs(choices) do order[i] = choice end
      local selection = ink.rng(${settings.seed} * 65537 + 83)
      for i = #order, 2, -1 do
        local j = selection.int(1, i)
        order[i], order[j] = order[j], order[i]
      end
      local result = {}
      for i = 1, 4 do
        local choice = order[(i - 1) % #order + 1]
        local sp = species.sample(original[i].seed, choice.plan, nil, {
          plan = choice.plan, inflo = "solitary", color = "pink", merovar = 0,
          phenology = 0, habit = "erect", tendrils = 0,
          form = choice.plan == "lily" and "lily" or choice.plan == "daisy" and "head" or "rosaceous"
        })
        sp.slot, sp.garden_flower = i, choice
        result[i] = sp
      end
      return result
    end
    local function shade(c, amount)
      local target = amount > 0 and 1 or 0
      local a = math.abs(amount)
      return {c[1] + (target-c[1])*a, c[2] + (target-c[2])*a, c[3] + (target-c[3])*a}
    end
    local function dot(x, y, radius, c)
      ink.circle(x, y, radius) ink.fill(c)
    end
    local function petal(angle, length, width, c, pointed, base)
      ink.push() ink.rotate(angle) ink.translate(0, base or 0)
      ink.moveto(0, 0)
      ink.curveto(-width, length*.3, -width, length*.86, 0, length)
      ink.curveto(width, length*(pointed and .66 or 1.08), width, length*.25, 0, 0)
      ink.close() ink.fill(c)
      ink.moveto(0, length*.12)
      ink.curveto(-width*.16, length*.42, width*.12, length*.68, 0, length*.9)
      ink.stroke(shade(c, -.22), .24, .65, false)
      ink.pop()
    end
    local function ring(n, length, width, c, offset, pointed, base)
      for i = 1, n do
        petal(i*360/n + offset + detail_rng.sym(3), length*detail_rng.range(.94,1.04), width,
          shade(c, detail_rng.range(-.10,.14)), pointed, base)
      end
    end
    local function paint_flower(d, stage, ghost)
      local id, c = current_flower.id, current_flower.rgb
      if ghost then c = shade(c, .72) end
      ink.push()
      ink.scale(d * math.min(1, .55 + (stage-.3)*.9))
      ink.rotate(detail_rng.sym(9))
      if id == "rose" then
        for layer = 0, 3 do
          ring(7-layer, .46-layer*.095, .23-layer*.045, shade(c, -layer*.1), layer*37, false)
        end
        dot(0,0,.045,shade(c,-.48))
      elseif id == "tiger-lily" then
        ring(6,.47,.105,c,0,true)
        for i=1,6 do
          ink.push() ink.rotate(i*60)
          for j=1,8 do dot(detail_rng.sym(.042),detail_rng.range(.16,.36),.008,shade(c,-.68)) end
          ink.moveto(0,0) ink.lineto(.035,.23) ink.stroke({.36,.30,.12},.4,1,false)
          dot(.035,.23,.016,{.38,.19,.09}) ink.pop()
        end
      elseif id == "tulip" then
        ink.translate(0,-.34)
        petal(-24,.70,.20,shade(c,-.17),true)
        petal(24,.70,.20,shade(c,-.06),true)
        petal(0,.67,.25,shade(c,.12),true)
      elseif id == "snowdrop" then
        -- A bent green pedicel and three hanging outer tepals.
        ink.moveto(0,-.25) ink.curveto(-.12,.43,.24,.49,.12,.22)
        ink.stroke({.34,.45,.27},.65,1,false)
        ink.translate(.12,.22)
        petal(150,.56,.12,shade(c,-.08),false)
        petal(210,.56,.12,shade(c,.04),false)
        petal(180,.46,.13,c,false)
        dot(0,-.12,.035,{.44,.55,.32})
      elseif id == "pansy" then
        petal(-40,.45,.25,shade(c,-.12),false)
        petal(40,.45,.25,shade(c,-.12),false)
        petal(-105,.43,.24,shade(c,.25),false)
        petal(105,.43,.24,shade(c,.25),false)
        petal(180,.46,.30,shade(c,.35),false)
        for _,a in ipairs({-105,105,180}) do petal(a,.23,.095,shade(c,-.64),true) end
        dot(0,0,.04,{.96,.76,.23})
      else
        local cornflower = id == "bachelors-button"
        local sunflower = id == "sunflower"
        ring(sunflower and 21 or cornflower and 16 or 27,.34,
          sunflower and .065 or cornflower and .055 or .028,c,0,true,.11)
        if cornflower then
          ring(17,.25,.038,shade(c,.12),11,true,.06)
          ring(13,.16,.026,shade(c,-.20),5,true,.02)
        end
        local radius = sunflower and .20 or .095
        local center = sunflower and {.30,.20,.10} or cornflower and shade(c,-.5) or {.89,.62,.17}
        dot(0,0,radius,center)
        local count = sunflower and 90 or 26
        for i=1,count do
          local a, r = i*2.399963, radius*.91*math.sqrt(i/count)
          dot(math.cos(a)*r,math.sin(a)*r,sunflower and .009 or .007,shade(center,.32))
        end
      end
      ink.pop()
    end
    native.bloom = function(d, stage, options)
      if current_flower and stage >= .3 and stage <= 1.15 then
        return paint_flower(d, stage, false)
      end
      return old_bloom(d, stage, options)
    end
    local flower_draw = native.draw
    native.draw = function(kind, plant, seed, options)
      current_flower = plant and plant.garden_flower
      detail_rng = ink.rng(seed or 1)
      local ok, result = pcall(function()
        if kind == "ghost" and current_flower then paint_flower(options.d, .8, true) return true end
        return flower_draw(kind, plant, seed, options)
      end)
      current_flower = nil
      if not ok then error(result) end
      return result
    end
    local function restore_flowers()
      species.community, native.bloom, native.draw = old_community, old_bloom, flower_draw
    end
  `;
}
