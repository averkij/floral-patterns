export const TEXT_FONTS = [
  { id: 'serif', label: 'Классический', family: 'Georgia, serif', file: '' },
  { id: 'greatvibes', label: 'Great Vibes', family: '"Great Vibes", cursive', file: 'greatvibes/GreatVibes-Regular.ttf' },
  { id: 'marckscript', label: 'Marck Script', family: '"Marck Script", cursive', file: 'marckscript/MarckScript-Regular.ttf' },
  { id: 'badscript', label: 'Bad Script', family: '"Bad Script", cursive', file: 'badscript/BadScript-Regular.ttf' },
] as const;
export type TextFont = typeof TEXT_FONTS[number]['id'];
export const TEXT_SIZES = [10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64] as const;
export const isTextFont = (value: unknown): value is TextFont => TEXT_FONTS.some(f => f.id === value);
export const textFont = (id: TextFont = 'serif') => TEXT_FONTS.find(f => f.id === id)!;

/** Embed only the selected font so a downloaded SVG needs no network or installed font. */
export async function embeddedTextFont(id: TextFont, base: string): Promise<string> {
  const font = textFont(id);
  if (!font.file) return '';
  const [response, license] = await Promise.all([
    fetch(new URL(font.file, base)), fetch(new URL(`${id}/OFL.txt`, base)),
  ]);
  if (!response.ok || !license.ok) throw new Error('Could not load text font or its license.');
  const bytes = new Uint8Array(await response.arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  const notice = (await license.text()).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);
  return `<metadata data-font-license="${font.id}">${notice}</metadata><style>@font-face{font-family:'${font.label}';font-style:normal;font-weight:400;src:url(data:font/ttf;base64,${btoa(binary)}) format('truetype')}</style>`;
}
