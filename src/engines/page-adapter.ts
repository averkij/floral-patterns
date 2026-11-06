import { FLORILEGIUM_REVISION, PAGE_ADAPTER } from './page-types';
import type { PageResult, PageSettings, PageVisitor, VisitorSummary } from './page-types';

export const LUA_MODULES = [
  'florilegium',
  'florilegium-ink',
  'florilegium-flora',
  'florilegium-grow',
  'florilegium-authored',
  'florilegium-figures',
  'florilegium-theme-geometric',
  'florilegium-theme-math',
  'florilegium-svg',
  'florilegium-species',
  'florilegium-pgfmath',
  'florilegium-native',
] as const;

const VISITOR_GROUPS: Record<PageVisitor, string> = {
  butterfly: 'lepidoptera',
  bee: 'bee',
  bird: 'bird',
  snail: 'snail',
  dragonfly: 'odonate',
  beetle: 'beetle',
  caterpillar: 'larva',
  fly: 'fly',
};

export interface PagePanel {
  name: string;
  width: number;
  length: number;
  transform: string;
  seed: number;
}

interface RawVisitor {
  kind: string;
  group: string;
  text: string;
  at: string;
}
export interface PanelResult {
  svg: string;
  stats?: { motifs?: number; stems?: number; visitors?: RawVisitor[] | Record<string, RawVisitor> };
}

export function validatePageSettings(settings: PageSettings): void {
  if (settings.version !== 1)
    throw new Error('This page configuration uses an unsupported version.');
  if (!Number.isInteger(settings.seed) || settings.seed < 1 || settings.seed > 2147483646) {
    throw new Error('Choose a whole seed from 1 to 2147483646.');
  }
  for (const key of ['ink', 'accent', 'paper'] as const) {
    if (!/^#?[0-9a-f]{6}$/i.test(settings[key]))
      throw new Error(`The ${key} color must have six hexadecimal digits.`);
  }
  const { x, y, width, height } = settings.rect;
  if (
    ![x, y, width, height].every(Number.isFinite) ||
    x < 18 ||
    y < 18 ||
    width < 40 ||
    height < 40 ||
    x + width > 192 ||
    y + height > 279
  ) {
    throw new Error(
      'Keep the rectangle at least 40 × 40 mm, with at least 18 mm of space on every edge.',
    );
  }
  if (!Number.isFinite(settings.density) || settings.density < 0.2 || settings.density > 1) {
    throw new Error('Choose a density between 0.2 and 1.');
  }
  if (!['spring', 'summer', 'autumn'].includes(settings.season))
    throw new Error('Choose spring, summer or autumn.');
  if (
    !Array.isArray(settings.visitors) ||
    settings.visitors.some((visitor) => !(visitor in VISITOR_GROUPS))
  ) {
    throw new Error('This page configuration includes an unknown visitor.');
  }
}

export function pagePanels(settings: PageSettings): PagePanel[] {
  const r = settings.rect;
  return [
    { name: 'left', width: r.x, length: 297, transform: '', seed: settings.seed },
    {
      name: 'right',
      width: 210 - r.x - r.width,
      length: 297,
      transform: 'translate(210 297) rotate(180)',
      seed: 0,
    },
    {
      name: 'top',
      width: r.y,
      length: r.width,
      transform: `translate(${r.x} ${r.y}) rotate(-90)`,
      seed: 0,
    },
    {
      name: 'bottom',
      width: 297 - r.y - r.height,
      length: r.width,
      transform: `translate(${r.x + r.width} ${r.y + r.height}) rotate(90)`,
      seed: 0,
    },
  ].map((panel, index) => ({
    ...panel,
    seed: ((settings.seed - 1 + index * 104729) % 2147483646) + 1,
  }));
}

/** Only validated numbers and known enum/hex strings enter these Lua literals. */
export function panelLua(settings: PageSettings, panel: PagePanel): string {
  const allowed = Object.entries(VISITOR_GROUPS)
    .filter(([key]) => settings.visitors.includes(key as PageVisitor))
    .map(([, group]) => `${group} = true`)
    .join(', ');
  return `
    local native = require("florilegium-native")
    local species = require("florilegium-species")
    local original_draw = native.draw
    local allowed = { ${allowed} }
    -- The upstream layout still reserves each visitor's space. Filtering only
    -- drawing preserves plants when a visitor control changes.
    native.draw = function(kind, plant, seed, options)
      if kind == "visitor" then
        local visitor = species.vsample(options.seed, options.role)
        if not allowed[visitor.group] then return true end
      end
      return original_draw(kind, plant, seed, options)
    end
    local ok, result = pcall(function()
      local svg, geometry, extra = require("florilegium-svg").page({
        paper = { "${panel.width + 25}mm", "${panel.length}mm" },
        left = "${panel.width}mm", right = "2mm", top = "5mm", bottom = "15mm",
        footskip = "0mm", headsep = "0mm", headheight = "0mm", head = false,
        seed = ${panel.seed}, ink = "${settings.ink.replace('#', '')}", accent = "${settings.accent.replace('#', '')}",
        density = ${settings.density}, season = "${settings.season}", visitors = true,
        id = "frame-${panel.name}-"
      })
      local stats = extra.stats or {}
      local visitors = {}
      for _, visitor in ipairs(stats.visitors or {}) do
        if allowed[visitor.group] then visitors[#visitors + 1] = visitor end
      end
      stats.visitors = visitors
      return { svg = svg, stats = stats }
    end)
    native.draw = original_draw
    if not ok then error(result) end
    return result
  `;
}

function escapeXml(text: string): string {
  return text.replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]!,
  );
}

export function composePage(
  settings: PageSettings,
  panels: PagePanel[],
  results: PanelResult[],
  ms: number,
): PageResult {
  const groups: string[] = [];
  let motifs = 0;
  let stems = 0;
  const visitors: VisitorSummary[] = [];
  results.forEach((result, index) => {
    const panel = panels[index];
    const inner = result.svg.replace(/^\s*<svg\b[^>]*>/, '').replace(/<\/svg>\s*$/, '');
    if (inner === result.svg) throw new Error('Florilegium returned an invalid SVG panel.');
    // Upstream SVG uses PDF points. The inner viewport crops its column while
    // preserving physical scale; the four panel rectangles are disjoint.
    groups.push(
      `<g data-panel="${panel.name}" transform="${panel.transform}"><svg width="${panel.width}" height="${panel.length}" viewBox="0 0 ${(panel.width * 72) / 25.4} ${(panel.length * 72) / 25.4}" overflow="hidden">${inner}</svg></g>`,
    );
    motifs += result.stats?.motifs ?? 0;
    stems += result.stats?.stems ?? 0;
    // An empty Lua table arrives through Wasmoon as {}, rather than [].
    for (const visitor of Object.values(result.stats?.visitors ?? {}))
      visitors.push({ ...visitor, panel: panel.name });
  });
  const metadata = escapeXml(
    JSON.stringify({ adapter: PAGE_ADAPTER, revision: FLORILEGIUM_REVISION, settings }),
  );
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="297mm" viewBox="0 0 210 297">
<title>Florilegium — A4 floral frame, seed ${settings.seed}</title>
<desc>Four independently grown Florilegium margins around a reserved rectangle. Florilegium by Kevin Raymond, MIT license; framing adapter by Floral Patterns. Visitor selections filter drawing; the upstream layout reserves their space.</desc>
<metadata>${metadata}</metadata>
<rect width="210" height="297" fill="#${settings.paper.replace('#', '')}"/>
${groups.join('\n')}
</svg>`;
  return {
    svg,
    ms,
    stats: { motifs, stems, visitors },
    revision: FLORILEGIUM_REVISION,
    adapter: PAGE_ADAPTER,
  };
}
