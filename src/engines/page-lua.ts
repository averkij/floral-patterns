/**
 * Small, checked extension points in the pinned upstream generator. The source
 * remains in its submodule; only the Lua copy mounted into Wasmoon is adapted.
 * Plant drawing, free-space selection and the event scheduler stay upstream.
 */
export function adaptGrowSource(input: string): string {
  let source = input.replace(/\r\n/g, '\n');
  const replace = (before: string, after: string) => {
    if (source.split(before).length !== 2) {
      throw new Error('The pinned Florilegium source no longer matches the continuous-garden adapter.');
    }
    source = source.replace(before, after);
  };
  replace('  local NSTEM = D >= 0.6 and 3 or D >= 0.25 and 2 or 1', '  local NSTEM = g.stem_count or (D >= 0.6 and 3 or D >= 0.25 and 2 or 1)');
  replace('    mains[k] = pts', '    if g.stem_path then pts = g.stem_path(pts, k, g) end\n    mains[k] = pts');
  replace('  -- visitors on the stems: a snail crawling up a main stem, and now and then a',
    '  if g.place_visitors then g.place_visitors({field=fld, sdist=sdist, mains=mains, mainev=mainev,\n' +
    '    event=event, place=place, stem=stem, nearest=nearest_stem, visitors=vlist}) end\n' +
    '  -- visitors on the stems: a snail crawling up a main stem, and now and then a');
  replace('  local function top(sp, x, y, a, target, kmin, kmax, ev, single)',
    '  local function top(sp, x, y, a, target, kmin, kmax, ev, single)\n    if g.terminal_limit then target, kmin, kmax = g.terminal_limit(x, y, target, kmin, kmax) end');
  replace('  local function stem(pts, w0, w1, proxy)\n    ink.layer(L_STEM)',
    '  local function stem(pts, w0, w1, proxy)\n    if g.compact and now then\n      local _, length = ink.arclen(pts)\n      now.len, now.points, now.stroke_width = length, pts, math.max(w0, w1)\n    end\n    ink.layer(L_STEM)');
  replace('    if anim then\n      -- growing:', '    if anim and not g.compact then\n      -- growing:');
  replace('  local function place(layer, x, y, a, fn, path, steps)\n    ink.layer(layer)',
    '  local function place(layer, x, y, a, fn, path, steps)\n    if g.compact and now and not now.x then now.x, now.y = x, y end\n    ink.layer(layer)');
  replace('    if anim then\n      -- a few earlier copies', '    if anim and not g.compact then\n      -- a few earlier copies');
  replace('  local function overlay(parent, x, y, r, S)\n    if not anim then return end',
    '  local function overlay(parent, x, y, r, S)\n    if not anim or g.compact then return end');
  replace('    if anim then\n      for k = 1, 7 do', '    if anim and not g.compact then\n      for k = 1, 7 do');
  replace('    local tail = event({ kind = "stem", phase = "tail", len = x2 - e[1] })',
    '    local tail = event({ kind = "stem", phase = "tail", len = x2 - e[1] })\n    if g.compact then\n      tail.points = ink.sample(ink.bezier3(c[1], c[2], c[3], c[4], c[5], c[6], c[7], c[8]), 16)\n      tail.stroke_width = 0.3 * 2.54 / 72\n    end');
  replace('  if anim then\n    local total = schedule(events)', '  local compact_recording\n  if anim then\n    local total = schedule(events)');
  replace('    return { rec = ink.take_recording(), total = total }',
    '    compact_recording = { rec = ink.take_recording(), total = total, events = events }\n    if not g.compact then return compact_recording end');
  replace('  return { stats = { motifs = n, counts = counts, stems = #spts, cells = #gx, species = plants, fern = fernstat,\n    visitors = comm and vlist or nil } }',
    '  local result = { stats = { motifs = n, counts = counts, stems = #spts, cells = #gx, species = plants, fern = fernstat,\n    visitors = comm and vlist or nil } }\n  if compact_recording then compact_recording.stats = result.stats return compact_recording end\n  return result');
  return '-- Floral Patterns continuous-garden/2: adapter hooks, compact final-only event recording.\n' + source;
}

/** Convert final-only recording runs once; preserve paint order and motif clips. */
export const COMPACT_TIMELINE_LUA = String.raw`
  local function compact_svg(recording)
    local svg = require("florilegium-svg")
    local ids, events, visitors = {}, {}, {}
    local CM = 72 / 2.54
    for i, event in ipairs(recording.events) do
      if event.kind ~= "overlay" then
        local id = "e" .. i
        ids[event] = id
        visitors[id] = event.visitor
        local entry = { id = id, kind = event.kind == "stem" and "stem" or "bloom",
          start = event.t0, duration = event.dur, x = (event.x or 0) * CM, y = (event.y or 0) * CM }
        if event.points and #event.points > 1 then
          local path = {}
          for k, point in ipairs(event.points) do
            path[#path + 1] = string.format("%s%.3f %.3f", k == 1 and "M" or "L", point[1] * CM, point[2] * CM)
          end
          entry.path = table.concat(path, " ")
          entry.width = math.max(0.8, (event.stroke_width or 0.04) * CM + 0.65)
          entry.length = (event.len or 0) * CM
          entry.x, entry.y = event.points[1][1] * CM, event.points[1][2] * CM
        end
        events[#events + 1] = entry
      end
    end
    local output, serial = {}, 0
    for _, key in ipairs(recording.rec.keys) do
      -- Upstream's widened safety clip occupies layers 0/99. The adapter
      -- supplies one exact page-minus-reservation clip around the whole scene.
      if key ~= 0 and key ~= 99 then
        local layer, tags = recording.rec.layers[key], recording.rec.tags[key]
        local parts, current = {}, nil
        local function flush()
          if #parts == 0 then return end
          serial = serial + 1
          if current then output[#output + 1] = '<g data-growth-event="' .. current .. '"' ..
            (visitors[current] and ' data-visitor="' .. visitors[current] .. '"' or '') .. '>' end
          svg.translate("q 1 J 1 j\n" .. table.concat(parts, "\n") .. "\nQ", output, "garden-" .. serial .. "-")
          if current then output[#output + 1] = '</g>' end
          parts = {}
        end
        for i, drawing in ipairs(layer) do
          local tag = tags[i]
          local id = tag and ids[tag[1]] or nil
          if not tag or not tag.overlay then
            if id ~= current then flush() current = id end
            parts[#parts + 1] = drawing
          end
        end
        flush()
      end
    end
    return table.concat(output, "\n"), events
  end
`;
