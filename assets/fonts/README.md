# Cyrillic calligraphy fonts

These unmodified TTF files, upstream metadata and OFL 1.1 licenses were downloaded from [Google Fonts revision 86aced91de05cd4f96a06838124cca45be337b2b](https://github.com/google/fonts/tree/86aced91de05cd4f96a06838124cca45be337b2b/ofl) on 2026-11-07. The revision is also recorded in `google-fonts-revision.txt`. No network download occurs during the site build.

| Font | Source | SHA-256 of TTF |
| --- | --- | --- |
| Great Vibes | [greatvibes](https://github.com/google/fonts/tree/86aced91de05cd4f96a06838124cca45be337b2b/ofl/greatvibes), The Great Vibes Pro Project Authors | `8d509802186f1b51572531ecf313e8098f9a5bfdfaca93f0c9b34467f9982d15` |
| Marck Script | [marckscript](https://github.com/google/fonts/tree/86aced91de05cd4f96a06838124cca45be337b2b/ofl/marckscript), Denis Masharov and Marck Fogel | `504de8cc6f919163bc9afb67b9bc208d258230c5e8d00cb82ec52474f9fafc3b` |
| Bad Script | [badscript](https://github.com/google/fonts/tree/86aced91de05cd4f96a06838124cca45be337b2b/ofl/badscript), The Bad Script Project Authors | `40ec737eee65ec4efbc24ae636fa31d7d84d1ccca83ab54cd555edb72cb3eaf0` |

All three upstream metadata files declare Cyrillic support. `scripts/font-metrics.py` checks the full Russian alphabet including Ё/ё against each font's cmap, and extracts advance widths and vertical metrics into checked-in `src/font-metrics.json`. Regenerate only when deliberately updating fonts: `python scripts/font-metrics.py` (requires fontTools; generation used 4.51.0). The ordinary JavaScript build does not require Python.

`prepare-assets.mjs` copies each directory into `public/fonts/` for static hosting. The page preview loads fonts locally. Export embeds only the selected TTF and its complete OFL notice into the SVG. Georgia remains the legacy system-font option. Text is SVG text, not outlined glyphs; external editors must support SVG embedded fonts to reproduce the Google font without installation.
