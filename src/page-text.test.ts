import { expect, test } from 'vitest';
import { layoutPageText, normalizePageText, pageTextSvg, withoutPageText } from './page-text';
import { initialState, sanitizeState, serializeState } from './state';
import { composeContinuousPage, validatePageSettings } from './engines/page-adapter';
import { TEXT_FONTS } from './text-fonts';
import metrics from './font-metrics.json';

test('page text shares and exports as escaped plain text without changing the floral scene', () => {
  const text = 'Для тебя & меня\n<svg onload="alert(1)">';
  const state = sanitizeState({ version: 1, page: { text } });
  expect(JSON.parse(decodeURIComponent(serializeState(state).slice(8))).page.text).toBe(text);
  expect(sanitizeState({ version: 1, page: {} }).page.text).toBe('');
  const raw = { body: '<path d="M0 0L10 10"/>', events: [], duration: 1, stats: { motifs: 1, stems: 1, cells: 1 } };
  const settings = { version: 1 as const, ...initialState.page };
  const blank = composeContinuousPage(settings, raw, 0);
  const written = composeContinuousPage({ ...settings, text }, raw, 0, true);
  expect(written.svg).toContain('&lt;svg');
  expect(written.svg).not.toContain('<svg onload');
  expect(written.svg).toContain('Для тебя &amp; меня');
  expect(written.svg).toContain('data-page-text="true"');
  expect(written.timeline?.svg).toBe(written.svg);
  expect(written.stats).toEqual(blank.stats);
  expect(written.svg.match(/<path[^>]+>/g)).toEqual(blank.svg.match(/<path[^>]+>/g));
  expect(withoutPageText(written.svg)).not.toContain('data-page-text="true"');
  expect(pageTextSvg('', settings.rect, settings.ink)).toBe('');
});

test('text color defaults to black for legacy settings and changes independently of the floral scene', () => {
  const legacy = sanitizeState({ version: 1, page: { ink: '#123456', text: 'Привет' } });
  expect(legacy.page.textColor).toBe('#000000');
  expect(sanitizeState({ version: 1, page: { textColor: 'url(bad)' } }).page.textColor).toBe('#000000');
  const settings = { version: 1 as const, ...legacy.page, textColor: undefined };
  const raw = { body: '<path d="M0 0L10 10"/>', events: [], duration: 1, stats: { motifs: 1, stems: 1, cells: 1 } };
  const black = composeContinuousPage(settings, raw, 0);
  const colored = composeContinuousPage({ ...settings, textColor: '#87234a' }, raw, 0, true);
  expect(black.svg).toMatch(/<g data-page-text="true"[^>]*fill="#000000"/);
  expect(colored.svg).toMatch(/<g data-page-text="true"[^>]*fill="#87234a"/);
  expect(colored.timeline?.svg).toBe(colored.svg);
  expect(colored.svg.match(/<path[^>]+>/g)).toEqual(black.svg.match(/<path[^>]+>/g));
  expect(() => validatePageSettings({ ...settings, textColor: 'url(bad)' })).toThrow('text color');
});

test('calligraphic fonts cover Russian, respect selected point sizes and survive settings sanitization', () => {
  for (const font of TEXT_FONTS) {
    const settings = sanitizeState({ version: 1, page: { textFont: font.id, textSize: 32 } });
    expect(settings.page.textFont).toBe(font.id);
    expect(settings.page.textSize).toBe(32);
    const small = layoutPageText('Для тебя', initialState.page.rect, 14, font.id);
    const large = layoutPageText('Для тебя', initialState.page.rect, 32, font.id);
    expect(large.fontSize / small.fontSize).toBeCloseTo(32 / 14);
    expect(pageTextSvg('Привет', initialState.page.rect, '#123456', 32, font.id)).toContain('font-family=');
    if (font.id !== 'serif') {
      for (const letter of 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюя')
        expect((metrics[font.id].widths as Record<string, number>)[letter.codePointAt(0)!]).toBeGreaterThan(0);
    }
  }
  const invalid = sanitizeState({ version: 1, page: { textFont: 'unknown', textSize: -20, flowersMatchInk: 'yes' } });
  expect(invalid.page.textFont).toBe('serif');
  expect(invalid.page.textSize).toBe(14);
  expect(invalid.page.flowersMatchInk).toBe(false);
});

test('text wraps words, breaks long words, preserves paragraphs and shrinks into small regions', () => {
  const rect = { x: 20, y: 20, width: 40, height: 40 };
  const short = layoutPageText('Привет\nмир', rect);
  expect(short.lines).toEqual(['Привет', 'мир']);
  for (const text of ['Ш'.repeat(2000), 'Длинный текст '.repeat(150), '\n'.repeat(1999), '🌷'.repeat(1000)]) {
    const layout = layoutPageText(text, rect);
    expect(layout.fontSize).toBeGreaterThan(0);
    expect(layout.lines.length * layout.lineHeight).toBeLessThanOrEqual(rect.height - 12 + 1e-8);
    expect(layout.y).toBeGreaterThan(rect.y);
    expect(layout.y + (layout.lines.length - 1) * layout.lineHeight).toBeLessThan(rect.y + rect.height);
    expect(layout.fontSize).toBeLessThan(short.fontSize);
  }
  expect(normalizePageText('А\r\nБ\u0001')).toBe('А\nБ');
  expect([...normalizePageText('🌷'.repeat(2001))]).toHaveLength(2000);
});
