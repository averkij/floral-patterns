"""Rebuild checked-in text metrics from the pinned Google Fonts TTFs (fontTools)."""
import json
from pathlib import Path
from fontTools.ttLib import TTFont

root = Path(__file__).resolve().parents[1]
fonts = {}
for slug, filename in [('greatvibes', 'GreatVibes-Regular.ttf'), ('marckscript', 'MarckScript-Regular.ttf'), ('badscript', 'BadScript-Regular.ttf')]:
    font = TTFont(root / 'assets' / 'fonts' / slug / filename)
    units = font['head'].unitsPerEm
    cmap = font.getBestCmap()
    assert all(ord(c) in cmap for c in 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюя')
    fonts[slug] = {
        'ascent': round(font['hhea'].ascent / units, 5),
        'descent': round(-font['hhea'].descent / units, 5),
        'widths': {str(code): round(font['hmtx'][name][0] / units, 5) for code, name in sorted(cmap.items())},
    }
(root / 'src' / 'font-metrics.json').write_text(json.dumps(fonts, separators=(',', ':')), encoding='utf-8')
