import type { PageSettings } from './page-types';

/**
 * Browser domain adapter for Florilegium's native centimetre / bottom-left space.
 * Assumes local `grow` and `flora` module bindings. Call configure(g) once before
 * grow.page, then restore_domain() on success or error. The caller inserts checked
 * hooks for stem_count, stem_path and terminal_limit into its runtime source copy.
 * The upstream submodule and the layout RNG stream are left unchanged.
 */
export function continuousDomainLua(settings: PageSettings): string {
  const { x, y, width, height } = settings.rect;
  const values = [x, y, width, height];
  if (!values.every(Number.isFinite)) throw new Error('Invalid page domain.');
  const left = x / 10;
  const right = (x + width) / 10;
  const bottom = (297 - y - height) / 10;
  const top = (297 - y) / 10;

  return `
    local domain_original_regions = grow.regions
    local domain_original_branch = flora.branch_path
    local domain_left, domain_right = ${left}, ${right}
    local domain_bottom, domain_top = ${bottom}, ${top}
    local domain_x0, domain_y0, domain_x1, domain_y1 = 0.3, 0.4, 20.7, 29.2
    local domain_guard = 0.18
    local function domain_dist(a, b)
      local dx, dy = b[1] - a[1], b[2] - a[2]
      return math.sqrt(dx * dx + dy * dy)
    end
    local function domain_copy(p) return { p[1], p[2] } end
    local function domain_inside(x, y, gap)
      return x > domain_left - gap and x < domain_right + gap
        and y > domain_bottom - gap and y < domain_top + gap
    end
    -- Slab intersection checks full segments, not only their sampled endpoints.
    local function domain_clear(a, b)
      if a[1] < domain_x0 or a[1] > domain_x1 or a[2] < domain_y0 or a[2] > domain_y1
        or b[1] < domain_x0 or b[1] > domain_x1 or b[2] < domain_y0 or b[2] > domain_y1 then return false end
      local low, high = 0, 1
      local limits = { { domain_left - 0.08, domain_right + 0.08 },
        { domain_bottom - 0.08, domain_top + 0.08 } }
      for axis = 1, 2 do
        local delta = b[axis] - a[axis]
        local lo, hi = limits[axis][1], limits[axis][2]
        if math.abs(delta) < 1e-10 then
          if a[axis] <= lo or a[axis] >= hi then return true end
        else
          local enter, leave = (lo - a[axis]) / delta, (hi - a[axis]) / delta
          if enter > leave then enter, leave = leave, enter end
          low, high = math.max(low, enter), math.min(high, leave)
          if low >= high then return true end
        end
      end
      return high <= 0 or low >= 1
    end
    local function domain_path_clear(path)
      for i = 2, #path do if not domain_clear(path[i - 1], path[i]) then return false end end
      return true
    end
    local function domain_line(out, p)
      local start = out[#out]
      local steps = math.max(1, math.ceil(domain_dist(start, p) / 0.12))
      for i = 1, steps do
        local u = i / steps
        out[#out + 1] = { start[1] + (p[1] - start[1]) * u, start[2] + (p[2] - start[2]) * u }
      end
    end
    -- Round a guide polyline only if its complete sampled curve stays outside
    -- the exclusion. Close sampling also limits overshoot in upstream ink.smooth.
    local function domain_sample(guide, radius)
      local out = { domain_copy(guide[1]) }
      for i = 2, #guide - 1 do
        local before, point, after = guide[i - 1], guide[i], guide[i + 1]
        local d0, d1 = domain_dist(before, point), domain_dist(point, after)
        local r = math.min(radius, d0 * 0.3, d1 * 0.3)
        if r > 1e-5 then
          local entry = { point[1] + (before[1] - point[1]) * r / d0, point[2] + (before[2] - point[2]) * r / d0 }
          local leave = { point[1] + (after[1] - point[1]) * r / d1, point[2] + (after[2] - point[2]) * r / d1 }
          domain_line(out, entry)
          local steps = math.max(3, math.ceil(2 * r / 0.1))
          for j = 1, steps do
            local t, s = j / steps, 1 - j / steps
            out[#out + 1] = { s * s * entry[1] + 2 * s * t * point[1] + t * t * leave[1],
              s * s * entry[2] + 2 * s * t * point[2] + t * t * leave[2] }
          end
        else domain_line(out, point) end
      end
      domain_line(out, guide[#guide])
      if radius > 0 and not domain_path_clear(out) then return domain_sample(guide, 0) end
      return out
    end
    local function domain_route(start, finish)
      if domain_clear(start, finish) then return { start, finish } end
      local pad = domain_guard + 0.06
      local nodes = { start, finish,
        { domain_left - pad, domain_bottom - pad }, { domain_right + pad, domain_bottom - pad },
        { domain_right + pad, domain_top + pad }, { domain_left - pad, domain_top + pad } }
      local distance, previous, visited = { 0 }, {}, {}
      for i = 2, #nodes do distance[i] = math.huge end
      for _ = 1, #nodes do
        local best
        for i = 1, #nodes do if not visited[i] and (not best or distance[i] < distance[best]) then best = i end end
        if not best or distance[best] == math.huge then break end
        if best == 2 then
          local path, at = {}, 2
          while at do table.insert(path, 1, nodes[at]) at = previous[at] end
          return path
        end
        visited[best] = true
        for i = 1, #nodes do
          if not visited[i] and domain_clear(nodes[best], nodes[i]) then
            local candidate = distance[best] + domain_dist(nodes[best], nodes[i])
            if candidate < distance[i] then distance[i], previous[i] = candidate, best end
          end
        end
      end
      return nil
    end
    local function domain_clearance(x, y)
      local dx = math.max(domain_left - x, 0, x - domain_right)
      local dy = math.max(domain_bottom - y, 0, y - domain_top)
      return math.max(0, math.min(x - domain_x0, domain_x1 - x, y - domain_y0, domain_y1 - y,
        math.sqrt(dx * dx + dy * dy) - domain_guard))
    end
    local function configure(g)
      g.mirror, g.spill, g.stem_count = false, 0, 3
      g.pw, g.ph = 21, 29.7
      g.textleft, g.textright = domain_left, domain_right
      g.ybot, g.ytop = domain_bottom, domain_top
      -- Keep legacy left-column decoration/visitor assumptions local to the left.
      g.colright, g.footy = domain_left - 0.4, domain_bottom - 0.05
      grow.regions = function(_, layout)
        layout.range(0.42, 0.52) -- retain the upstream footer's layout-stream draw
        local col = { domain_x0, domain_y0, domain_left - domain_guard, domain_y1 }
        local foot = { domain_x0, domain_y0, domain_x1, math.min(1.75, domain_bottom - domain_guard) }
        local rects = { col,
          { domain_right + domain_guard, domain_y0, domain_x1, domain_y1 },
          { domain_x0, domain_y0, domain_x1, domain_bottom - domain_guard },
          { domain_x0, domain_top + domain_guard, domain_x1, domain_y1 }, corners = true }
        return rects, col, foot, nil, domain_x1
      end
      g.stem_path = function(original, k)
        local root = domain_copy(original[1])
        local lx = (domain_x0 + domain_left - domain_guard) / 2
        local rx = (domain_right + domain_guard + domain_x1) / 2
        local by = (domain_y0 + domain_bottom - domain_guard) / 2
        local ty = math.max(domain_y1 - 2.6, (domain_top + domain_guard + domain_y1) / 2)
        local endpoint = math.min(27.1, domain_y1 - 0.9)
        local guide
        if k == 1 then
          guide = { root, { lx - 0.12, 4 }, { lx + 0.12, 12 }, { lx - 0.1, 20 }, { lx, endpoint } }
        elseif k == 2 then
          guide = { root, { math.max(root[1] + 1, lx), by }, { rx, by },
            { rx + 0.1, math.min(10, endpoint - 3) }, { rx - 0.1, 19 }, { rx, endpoint } }
        else
          local endx = domain_left + (domain_right - domain_left) * 0.77
          guide = { root, { lx + 0.25, 5 }, { lx + 0.15, ty },
            { endx - 0.6, ty }, { endx, ty }, { endx, math.min(domain_y1 - 0.25, ty + 0.35) } }
        end
        return domain_sample(guide, 0.65)
      end
      -- The top function also supports off-axis inflorescences. Reduce the
      -- entire unit scale, rather than shrinking just a clipping boundary.
      g.terminal_limit = function(x, y, target, kmin, kmax)
        local permitted = math.max(0.08, domain_clearance(x, y) * 0.68)
        local ratio = math.min(1, permitted / math.max(target, 1e-6))
        return target * ratio, kmin * ratio, kmax * ratio
      end
      flora.branch_path = function(rng, sx, sy, tx, ty, bx, by, ax, ay)
        local native = domain_original_branch(rng, sx, sy, tx, ty, bx, by, ax, ay)
        if domain_path_clear(native) then return native end
        local start, finish = { sx, sy }, { bx, by }
        -- Try to keep the native departure/arrival directions with short handles.
        local departure, arrival = native[math.min(2, #native)], native[math.max(1, #native - 1)]
        local ds, de = domain_dist(start, departure), domain_dist(arrival, finish)
        local function shorten(origin, toward, distance)
          local u = math.min(1, 0.22 / math.max(distance, 1e-9))
          return { origin[1] + (toward[1] - origin[1]) * u, origin[2] + (toward[2] - origin[2]) * u }
        end
        departure, arrival = shorten(start, departure, ds), shorten(finish, arrival, de)
        if domain_clear(start, departure) and domain_clear(arrival, finish) then
          local route = domain_route(departure, arrival)
          if route then
            table.insert(route, 1, start) route[#route + 1] = finish
            return domain_sample(route, 0.12)
          end
        end
        local route = domain_route(start, finish)
        if route then return domain_sample(route, 0.12) end
        -- Rare legacy decorations can supply an endpoint already in the hole.
        -- Retain their native geometry; the final page exclusion remains exact.
        return native
      end
    end
    local function restore_domain()
      grow.regions, flora.branch_path = domain_original_regions, domain_original_branch
    end
  `;
}
