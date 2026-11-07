import type { PageSettings, PageVisitor } from './page-types';

const visitors: PageVisitor[] = ['butterfly', 'bee', 'bird', 'snail', 'dragonfly', 'beetle', 'caterpillar', 'fly'];

/** Required native visitors join the upstream field before leaves and branches. */
export function visitorsLua(settings: PageSettings): string {
  const definitions = visitors.flatMap((kind, i) => settings.visitors.includes(kind)
    ? [`{ kind="${kind}", role="${kind === 'bird' ? 'perch' : kind}", seed=${(settings.seed * 104729 + i * 7919 + 503) % 2147483645 + 1} }`] : []);
  return String.raw`
    local required_visitors = { ${definitions.join(',')} }
    local visitor_ink = require("florilegium-ink")
    local CM = 72 / 2.54
    local function prepare_visitors()
      local transform = visitor_ink.get_transform()
      for _, item in ipairs(required_visitors) do
        item.genome = species.vsample(item.seed, item.role)
        item.size = .29 * item.genome.size ^ .38 * (item.kind == "bird" and 1.4 or 1)
        -- Measure before the page recording starts; use native genome proportions,
        -- not a fixed page-band box. Rendering and measurement use the same size.
        visitor_ink.set_transform(visitor_ink.page_transform())
        visitor_ink.record(true) visitor_ink.track(true)
        original_draw("visitor", nil, 0, {seed=item.seed, role=item.role, size=item.size})
        local box = visitor_ink.track(false)
        visitor_ink.take_recording()
        for i = 1, 4 do box[i] = box[i] / CM end
        item.box = box
        item.cx, item.cy = (box[1]+box[3])/2, (box[2]+box[4])/2
        item.radius = math.sqrt((box[3]-box[1])^2 + (box[4]-box[2])^2)/2
        assert(item.radius > 0, "A selected visitor produced no visible geometry")
      end
      visitor_ink.set_transform(transform)
    end
    local function place_visitors(ctx)
      local field = ctx.field
      local function distance(x, y, u, v) return math.sqrt((x-u)^2+(y-v)^2) end
      local function attached_visitor(item, scale)
        local best, score
        local b, bird = item.box, item.kind == "bird"
        for k, pts in ipairs(ctx.mains) do
          for i = math.max(3, math.floor(#pts*.18)), bird and #pts-1 or math.floor(#pts*.76), 3 do
            local p, q = pts[i-1], pts[i+1]
            local a = bird and 0 or math.atan(q[2]-p[2], q[1]-p[1]) - math.pi/2
            local co, si = math.cos(a), math.sin(a)
            for _, side in ipairs(bird and {1} or {1, -1}) do
              local x, y = pts[i][1], pts[i][2]
              local function point(bx, by)
                bx, by = bx*scale*side, by*scale
                return x+co*bx-si*by, y+si*bx+co*by
              end
              local clear = true
              -- Feet may touch the supporting stem; the rest of the measured
              -- footprint must fit the field, including the shell and feelers.
              for u = 0, 6 do for v = 0, 8 do
                local bx, by = b[1]+(b[3]-b[1])*u/6, b[2]+(b[4]-b[2])*v/8
                local px, py = point(bx, by)
                if domain_clearance(px, py) < .06 then clear = false end
                local foot = bird and math.abs(by*scale) < .14 or not bird and math.abs(bx*scale) < .18
                if not foot and field.free_at(px, py) < .07 then clear = false end
              end end
              local cx, cy = point(item.cx, item.cy)
              -- Favor a seeded height, avoiding the crowded root and flower tips.
              local target = .3 + (item.seed % 997)/997*.3
              local rank = -math.abs(i/#pts-target) - k*.015 + math.min(1, field.free_at(cx,cy))*.05
              if clear and (not score or rank > score) then
                best, score = {x=x,y=y,cx=cx,cy=cy,a=a*180/math.pi+90,side=side,k=k,i=i,perched=bird}, rank
              end
            end
          end
        end
        return best
      end
      for _, item in ipairs(required_visitors) do
        local selected, scale = nil, 1
        for attempt = 1, 18 do
          if item.kind == "snail" then selected = attached_visitor(item, scale)
          else
            local radius, best = item.radius*scale+.13, -math.huge
            local preferred = 3 + (item.seed % 1009)/1009*22
            for i, x in ipairs(field.x) do
              local y, free = field.y[i], field.free[i]
              if free >= radius and domain_clearance(x,y) >= radius then
                local near = ctx.sdist[i]
                local rank = -math.abs(y-preferred)*.045 - math.abs(near-radius-.3)*.6
                  + math.min(free-radius,.5)*.15
                if rank > best then
                  local candidate = {x=x-item.cx*scale,y=y-item.cy*scale,cx=x,cy=y,a=90,side=1,clearance=free}
                  if item.kind == "bird" then
                    -- Approach a perch from below, never through the bird's body.
                    local closest = 3.5
                    for k, pts in ipairs(ctx.mains) do for j = 2, #pts, 3 do
                      local point = pts[j]
                      local d = distance(point[1],point[2],candidate.x,candidate.y)
                      if point[2] < candidate.y-.15 and d < closest and
                        domain_clear(point,{candidate.x-.25*item.size*scale,candidate.y}) then
                        closest, candidate.k, candidate.i = d, k, j
                      end
                    end end
                  end
                  if item.kind ~= "bird" or candidate.k then best,selected = rank,candidate end
                end
              end
            end
            -- In a narrow border a long bird fits on a stem even when an
            -- enclosing free disc does not. Fit its measured rectangle instead.
            if not selected and item.kind == "bird" then selected = attached_visitor(item,scale) end
          end
          if selected then break end
          scale = scale*.84
        end
        assert(selected, "No free space for selected visitor: " .. item.kind)
        local p = selected
        local parent, at
        if p.k then
          local lengths, total = visitor_ink.arclen(ctx.mains[p.k])
          parent, at = ctx.mainev[p.k], lengths[p.i]/total
        else
          local nearest = ctx.nearest(p.x,p.y)
          -- Resolve the main-stem event nearest to the chosen location.
          local best = math.huge
          for k, pts in ipairs(ctx.mains) do
            local lengths,total = visitor_ink.arclen(pts)
            for i, point in ipairs(pts) do
              local d = distance(point[1],point[2],nearest[1],nearest[2])
              if d < best then
                best, parent, at = d, ctx.mainev[k], lengths[i]/total
              end
            end
          end
        end
        if item.kind == "bird" then
          -- Native perch feet lie at y=0. Extend a short horizontal twig under
          -- both feet, with a rising connection from the supporting main stem.
          local support = ctx.mains[p.k][p.i]
          local unit = item.size*scale
          local guide = p.perched and {support,{p.x+.22*unit,p.y}}
            or {support,{p.x-.25*unit,p.y},{p.x+.22*unit,p.y}}
          local twig = domain_sample(guide,.18)
          parent = ctx.event({kind="stem",parent=parent,at=at})
          ctx.stem(twig,.045,.018,.06)
          at = 1
        end
        ctx.event({kind="bloom",parent=parent,at=at,span=item.kind=="snail" and .7 or 1.2,
          visitor=item.kind})
        ctx.place(grow.layers.accent,p.x,p.y,p.a,function()
          visitor_ink.scale(scale*p.side,scale)
          original_draw("visitor",nil,0,{seed=item.seed,role=item.role,size=item.size})
        end)
        local radius = item.radius*scale+.13
        field.disc(p.cx,p.cy,radius,1)
        -- The proxy is installed before foliage and the hole-filling loops.
        -- The compact recorder keeps the native parent/child event schedule.
        ctx.visitors[#ctx.visitors+1] = {kind=item.genome.kind,group=item.genome.group,
          text=species.vdescribe(item.genome),at=item.kind=="bird" and "twig" or item.kind=="snail" and "stem" or "flowers",
          placement={x=p.cx,y=p.cy,radius=radius,clearance=p.clearance,scale=scale,
            width=(item.box[3]-item.box[1])*scale,height=(item.box[4]-item.box[2])*scale}}
      end
    end
  `;
}
