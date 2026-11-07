import type { Rect } from './state';

export const PAGE_TEXT_LIMIT = 2000;
export const PAGE_TEXT_FONT = 'Georgia, serif';
export function normalizePageText(text: string): string {
  return [...text.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')]
    .slice(0, PAGE_TEXT_LIMIT).join('');
}

/** Conservative font-independent wrapping in millimetres, shared by preview and SVG. */
export function layoutPageText(text: string, rect: Rect) {
  const availableWidth = rect.width - 12, availableHeight = rect.height - 12;
  const advance = (letter: string) => /[MWШЩЖЮЫФМ]/.test(letter) ? 1 : /[il.,!':;| ]/.test(letter) ? .4 : /[\u0000-\u052f]/.test(letter) ? .7 : 1.2;
  const wrap = (fontSize: number) => {
    const lines: string[] = [];
    for (const paragraph of normalizePageText(text).split('\n')) {
      let line = '', width = 0;
      for (const word of paragraph.trim().split(/\s+/)) {
        const wordWidth = [...word].reduce((sum, c) => sum + advance(c) * fontSize, 0);
        if (line && width + .4 * fontSize + wordWidth > availableWidth) {
          lines.push(line); line = ''; width = 0;
        }
        if (line) { line += ' '; width += .4 * fontSize; }
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
  let fontSize = 5, lines = wrap(fontSize);
  // Long text scales down instead of silently disappearing beyond the reservation.
  while (lines.length * fontSize * 1.5 > availableHeight && fontSize > .3) {
    fontSize *= .95;
    lines = wrap(fontSize);
  }
  if (lines.length * fontSize * 1.5 > availableHeight) {
    fontSize = availableHeight / (lines.length * 1.5);
    lines = wrap(fontSize);
  }
  const lineHeight = fontSize * 1.5;
  return { lines, fontSize, lineHeight, x: rect.x + rect.width / 2,
    y: rect.y + (rect.height - lines.length * lineHeight) / 2 + fontSize };
}

const escapeXml = (text: string) => text.replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!);

export function pageTextSvg(text: string, rect: Rect, ink: string): string {
  if (!text.trim()) return '';
  const layout = layoutPageText(text, rect);
  return `<g data-page-text="true" font-family="${PAGE_TEXT_FONT}" font-size="${layout.fontSize}" text-anchor="middle" fill="${escapeXml(ink)}">${layout.lines.map((line, i) =>
    `<text x="${layout.x}" y="${layout.y + i * layout.lineHeight}">${escapeXml(line)}</text>`).join('')}</g>`;
}

/** The interactive text layer replaces the applied text without leaving stale copies. */
export function withoutPageText(svg: string): string {
  return svg.replace(/<g data-page-text="true"[^>]*>[\s\S]*?<\/g>/, '');
}
