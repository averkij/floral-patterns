import { FLORILEGIUM_REVISION, PAGE_ADAPTER } from './page-types';
import type { PageGrowthEvent, PageResult, PageSettings, PageVisitor, VisitorSummary } from './page-types';
import { COMPACT_TIMELINE_LUA } from './page-lua';
import { continuousDomainLua } from './page-domain';
import { flowersLua } from './page-flowers';
import { visitorsLua } from './page-visitors';
import { FLOWERS, isFlower } from '../flowers';
import { pageTextSvg, PAGE_TEXT_LIMIT } from '../page-text';
import { isTextFont, TEXT_SIZES } from '../text-fonts';

export const LUA_MODULES = [
  'florilegium', 'florilegium-ink', 'florilegium-flora', 'florilegium-grow',
  'florilegium-authored', 'florilegium-figures', 'florilegium-theme-geometric',
  'florilegium-theme-math', 'florilegium-svg', 'florilegium-species',
  'florilegium-pgfmath', 'florilegium-native',
] as const;

const VISITOR_GROUPS: Record<PageVisitor, string> = {
  butterfly: 'lepidoptera', bee: 'bee', bird: 'bird', snail: 'snail',
  dragonfly: 'odonate', beetle: 'beetle', caterpillar: 'larva', fly: 'fly',
};

export interface ContinuousResult {
  body: string;
  events: PageGrowthEvent[] | Record<string, PageGrowthEvent>;
  duration: number;
  stats: { motifs: number; stems: number; cells: number; visitors?: VisitorSummary[] | Record<string, VisitorSummary> };
}

export function validatePageSettings(settings: PageSettings): void {
  if (settings.version !== 1) throw new Error('This page configuration uses an unsupported version.');
  if (settings.text !== undefined && (typeof settings.text !== 'string' || [...settings.text].length > PAGE_TEXT_LIMIT)) throw new Error('Page text must contain at most 2000 characters.');
  if (settings.textFont !== undefined && !isTextFont(settings.textFont)) throw new Error('Choose a supported text font.');
  if (settings.textSize !== undefined && !TEXT_SIZES.some(size => size === settings.textSize)) throw new Error('Choose a supported text size.');
  if (settings.flowersMatchInk !== undefined && typeof settings.flowersMatchInk !== 'boolean') throw new Error('Choose a valid flower color mode.');
  if (!Number.isInteger(settings.seed) || settings.seed < 1 || settings.seed > 2147483646) throw new Error('Choose a whole seed from 1 to 2147483646.');
  for (const key of ['ink', 'accent', 'paper'] as const) {
    if (!/^#?[0-9a-f]{6}$/i.test(settings[key])) throw new Error(`The ${key} color must have six hexadecimal digits.`);
  }
  const { x, y, width, height } = settings.rect;
  if (![x, y, width, height].every(Number.isFinite) || x < 18 || y < 18 || width < 40 || height < 40 || x + width > 192 + 1e-8 || y + height > 279 + 1e-8) {
    throw new Error('Keep the rectangle at least 40 × 40 mm, with at least 18 mm of space on every edge.');
  }
  if (!Number.isFinite(settings.density) || settings.density < 0.2 || settings.density > 1) throw new Error('Choose a density between 0.2 and 1.');
  if (!['spring', 'summer', 'autumn'].includes(settings.season)) throw new Error('Choose spring, summer or autumn.');
  if (!Array.isArray(settings.visitors) || settings.visitors.some(visitor => !Object.hasOwn(VISITOR_GROUPS, visitor))) throw new Error('This page configuration includes an unknown visitor.');
  if (settings.flowers !== undefined && (!Array.isArray(settings.flowers) || !settings.flowers.length || settings.flowers.some(f => !isFlower(f)))) throw new Error('Choose at least one known flower.');
  if (settings.flowerColors !== undefined && (!settings.flowerColors || FLOWERS.some(f => !/^#[0-9a-f]{6}$/i.test(settings.flowerColors![f.id])))) throw new Error('Flower colors must have six hexadecimal digits.');
}

/** One community, one free-space field, one event schedule on the real A4 page. */
export function continuousPageLua(settings: PageSettings): string {
  const r = settings.rect;
  return `
    local grow = require("florilegium-grow")
    local flora = require("florilegium-flora")
    local native = require("florilegium-native")
    local species = require("florilegium-species")
    local original_page, original_draw = grow.page, native.draw
    local recording
    local visitor_body, visitor_events
    ${continuousDomainLua(settings)}
    ${COMPACT_TIMELINE_LUA}
    native.draw = function(kind, plant, seed, options)
      if kind == "visitor" then return true end
      return original_draw(kind, plant, seed, options)
    end
    ${flowersLua(settings)}
    ${visitorsLua(settings)}
    grow.page = function(g)
      configure(g)
      g.anim, g.compact = true, true
      recording = original_page(g)
      visitor_body, visitor_events = append_visitors(recording)
      return { stats = recording.stats }
    end
    local ok, result = pcall(function()
      require("florilegium-svg").page({
        paper = "a4", left = "${r.x}mm", right = "${210 - r.x - r.width}mm",
        top = "${r.y}mm", bottom = "${297 - r.y - r.height}mm",
        footskip = "0mm", headsep = "0mm", headheight = "0mm", head = false,
        seed = ${settings.seed}, ink = "${settings.ink.replace('#', '')}", accent = "${settings.accent.replace('#', '')}",
        density = ${settings.density}, season = "${settings.season}", visitors = true, id = "garden-"
      })
      local body, events = compact_svg(recording)
      for _, event in ipairs(visitor_events) do events[#events+1] = event end
      return { body = body .. visitor_body, events = events, duration = recording.total, stats = recording.stats }
    end)
    restore_flowers()
    grow.page, native.draw = original_page, original_draw
    restore_domain()
    if not ok then error(result) end
    return result
  `;
}

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]!);
}

export function composeContinuousPage(settings: PageSettings, raw: ContinuousResult, ms: number, animate = false, fontCss = ''): PageResult {
  const scale = 72 / 25.4, width = 210 * scale, height = 297 * scale;
  const r = settings.rect;
  const left = r.x * scale, right = (r.x + r.width) * scale;
  const bottom = (297 - r.y - r.height) * scale, top = (297 - r.y) * scale;
  const clip = `M0 0H${width}V${height}H0Z M${left} ${bottom}V${top}H${right}V${bottom}Z`;
  const metadata = escapeXml(JSON.stringify({ adapter: PAGE_ADAPTER, revision: FLORILEGIUM_REVISION, settings }));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="297mm" viewBox="0 0 ${width} ${height}">
<title>Florilegium — сад на странице А4, вариант ${settings.seed}</title>
<desc>Цветочный сад вокруг области текста. Florilegium: Kevin Raymond, лицензия MIT; адаптация области роста и анимации: Flower Power.</desc>
<metadata>${metadata}</metadata>
${fontCss}
<defs><clipPath id="garden-reservation" clipPathUnits="userSpaceOnUse"><path d="${clip}" clip-rule="evenodd" fill-rule="evenodd"/></clipPath></defs>
<rect width="${width}" height="${height}" fill="#${settings.paper.replace('#', '')}"/>
<g transform="matrix(1 0 0 -1 0 ${height})" clip-path="url(#garden-reservation)" stroke-linecap="round" stroke-linejoin="round">
${raw.body}
</g><g transform="scale(${scale})">${pageTextSvg(settings.text ?? '', r, settings.ink, settings.textSize, settings.textFont)}</g></svg>`;
  return {
    svg, ms, adapter: PAGE_ADAPTER, revision: FLORILEGIUM_REVISION,
    stats: { motifs: raw.stats.motifs, stems: raw.stats.stems, visitors: Object.values(raw.stats.visitors ?? {}) },
    ...(animate ? { timeline: { svg, duration: raw.duration, events: Object.values(raw.events ?? {}) } } : {}),
  };
}
