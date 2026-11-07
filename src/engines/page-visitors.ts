import type { PageSettings, PageVisitor } from './page-types';

const visitors: PageVisitor[] = ['butterfly', 'bee', 'bird', 'snail', 'dragonfly', 'beetle', 'caterpillar', 'fly'];

/** Guaranteed, independently seeded native visitors in the page's four outer bands. */
export function visitorsLua(settings: PageSettings): string {
  const r = settings.rect;
  const definitions = visitors.flatMap((kind, i) => {
    if (!settings.visitors.includes(kind)) return [];
    const seed = (settings.seed * 104729 + i * 7919 + 503) % 2147483645 + 1;
    const offset = ((seed % 1009) / 1009 - .5) * .12;
    const t = (i < 4 ? .3 : .7) + offset;
    let x: number, y: number, width: number, height: number;
    if (i % 4 === 0 || i % 4 === 2) {
      width = i % 4 === 2 ? 32 : 25;
      height = Math.min(25, (i % 4 === 0 ? r.y : 297 - r.y - r.height) - 8);
      x = 20 + (170 - width) * t;
      y = i % 4 === 0 ? (r.y - height) / 2 : r.y + r.height + (297 - r.y - r.height - height) / 2;
    } else {
      width = Math.min(20, (i % 4 === 1 ? 210 - r.x - r.width : r.x) - 8);
      height = 20;
      x = i % 4 === 1 ? r.x + r.width + (210 - r.x - r.width - width) / 2 : (r.x - width) / 2;
      y = r.y + (r.height - height) * t;
    }
    // Drawing and animation coordinates are PDF points, with y increasing upwards.
    const scale = 72 / 25.4;
    return [`{ kind="${kind}", seed=${seed}, x=${x * scale}, y=${(297 - y - height) * scale}, w=${width * scale}, h=${height * scale} }`];
  });
  return String.raw`
    local guaranteed_visitors = { ${definitions.join(',')} }
    local function append_visitors(recording)
      local ink, svg = require("florilegium-ink"), require("florilegium-svg")
      local output, events, summaries = {}, {}, {}
      local transform, old_layer = ink.get_transform(), ink.layer(50)
      for _, item in ipairs(guaranteed_visitors) do
        ink.set_transform(ink.page_transform())
        ink.record(true)
        ink.track(true)
        original_draw("visitor", nil, 0, {seed=item.seed, role=item.kind, size=1})
        local box = ink.track(false)
        local rec = ink.take_recording()
        local parts = {}
        for _, key in ipairs(rec.keys) do
          svg.translate(table.concat(rec.layers[key], "\n"), parts, "visitor-" .. item.kind .. "-")
        end
        local w, h = box[3]-box[1], box[4]-box[2]
        assert(w > 0 and h > 0, "A selected visitor produced no visible geometry")
        local scale = math.min(item.w/w, item.h/h)
        local x, y = item.x + (item.w-w*scale)/2, item.y + (item.h-h*scale)/2
        local id = "visitor-" .. item.kind
        output[#output+1] = string.format('<g data-growth-event="%s" data-visitor="%s" transform="translate(%.4f %.4f) scale(%.6f) translate(%.4f %.4f)">%s</g>',
          id, item.kind, x, y, scale, -box[1], -box[2], table.concat(parts, "\n"))
        events[#events+1] = {id=id, kind="bloom", start=recording.total*.75, duration=recording.total*.2,
          x=x+w*scale/2, y=y+h*scale/2}
        local visitor = species.vsample(item.seed, item.kind)
        summaries[#summaries+1] = {kind=visitor.kind, group=visitor.group, text=species.vdescribe(visitor), at="page-band"}
      end
      ink.set_transform(transform) ink.layer(old_layer)
      recording.stats.visitors = summaries
      return table.concat(output, "\n"), events
    end
  `;
}
