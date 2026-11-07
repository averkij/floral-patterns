import type { Rect } from './state';
import { textFont, type TextFont } from './text-fonts';
import metrics from './font-metrics.json';

export const PAGE_TEXT_LIMIT = 2000;
export function normalizePageText(text: string): string {
  return [...text.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')]
    .slice(0, PAGE_TEXT_LIMIT).join('');
}

/** Conservative font-independent wrapping in millimetres, shared by preview and SVG. */
export function layoutPageText(text: string, rect: Rect, size = 14, font: TextFont = 'serif') {
  const availableWidth = rect.width - 12, availableHeight = rect.height - 12;
  const metric = font === 'serif' ? null : metrics[font];
  const widths: Record<string, number> = metric?.widths ?? {};
  const advance = (letter: string) => widths[letter.codePointAt(0)!] ?? (/[MWШЩЖЮЫФМ]/.test(letter) ? 1 : /[il.,!':;| ]/.test(letter) ? .4 : /[\u0000-\u052f]/.test(letter) ? .7 : 1.2);
  const ascent = metric?.ascent ?? 1;
  const leading = Math.max(1.5, ascent + (metric?.descent ?? .3) + .15);
  const wrap = (fontSize: number) => {
    const lines: string[] = [];
    for (const paragraph of normalizePageText(text).split('\n')) {
      let line = '', width = 0;
      for (const word of paragraph.trim().split(/\s+/)) {
        const wordWidth = [...word].reduce((sum, c) => sum + advance(c) * fontSize, 0);
        if (line && width + advance(' ') * fontSize + wordWidth > availableWidth) {
          lines.push(line); line = ''; width = 0;
        }
        if (line) { line += ' '; width += advance(' ') * fontSize; }
        for (const letter of word) {
          const next = advance(letter) * fontSize;
          if (line && width + next > availableWidth) { lines.push(line); line = ''; width = 0; }
          line += letter; width += next;
        }
      }
      lines.push(line);
    }
    return lines;
  };
  let fontSize = size * 25.4 / 72, lines = wrap(fontSize);
  // Long text scales down instead of silently disappearing beyond the reservation.
  while (lines.length * fontSize * leading > availableHeight && fontSize > .3) {
    fontSize *= .95;
    lines = wrap(fontSize);
  }
  if (lines.length * fontSize * leading > availableHeight) {
    fontSize = availableHeight / (lines.length * leading);
    lines = wrap(fontSize);
  }
  const lineHeight = fontSize * leading;
  return { lines, fontSize, lineHeight, x: rect.x + rect.width / 2,
    y: rect.y + (rect.height - lines.length * lineHeight) / 2 + fontSize * ascent };
}

const escapeXml = (text: string) => text.replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!);

export function pageTextSvg(text: string, rect: Rect, ink: string, size = 14, font: TextFont = 'serif'): string {
  if (!text.trim()) return '';
  const layout = layoutPageText(text, rect, size, font);
  return `<g data-page-text="true" font-family="${escapeXml(textFont(font).family)}" style="font-kerning:none;font-variant-ligatures:none;font-feature-settings:'calt' 0" font-size="${layout.fontSize}" text-anchor="middle" fill="${escapeXml(ink)}">${layout.lines.map((line, i) =>
    `<text x="${layout.x}" y="${layout.y + i * layout.lineHeight}">${escapeXml(line)}</text>`).join('')}</g>`;
}

/** The interactive text layer replaces the applied text without leaving stale copies. */
export function withoutPageText(svg: string): string {
  return svg.replace(/<g data-page-text="true"[^>]*>[\s\S]*?<\/g>/, '');
}
