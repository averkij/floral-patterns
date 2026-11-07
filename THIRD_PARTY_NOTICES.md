# Third-party notices

Floralia is an independent experimental interface. Source attributions do not imply endorsement by the referenced authors or institutions.

## Florilegium

The page composition demo runs Kevin Raymond's [Florilegium](https://github.com/kevinraymond/florilegium) Lua modules, copied without modification from the pinned submodule revision [`9fbaf56d53e6525e02da05cd802ea7da82052099`](https://github.com/kevinraymond/florilegium/tree/9fbaf56d53e6525e02da05cd802ea7da82052099), version 2.0.1.

Copyright (c) 2026 Kevin Raymond. Florilegium is distributed under the MIT license, except `florilegium-pgfmath.lua`, which is distributed under the LaTeX Project Public License 1.3c. The latter reimplements part of pgfmath and preserves its complete upstream attribution and maintenance notice in its source header. It is not part of PGF. That module remains unmodified.

Our continuous A4 adapter transforms the loaded MIT-licensed growth source with checked integration hooks and temporarily supplies domain/branch functions at runtime. These changes provide a shared page field, stems around a rectangular exclusion, constrained terminal sizes and compact growth playback. The pinned submodule and published vendor source copies remain unchanged. The adaptation and its limits are documented in `docs/development/florilegium-frame.md`.

The built site includes the source modules and notices in `vendor/florilegium/`: `LICENSE`, `PGFMATH-NOTICE.txt`, `LPPL-1.3c.txt`, and the original Lua source files.

## Lua and Wasmoon

The browser runs Lua through [Wasmoon](https://github.com/ceifa/wasmoon), copyright (c) 2023 Gabriel Francisco, MIT license. Its version is fixed by `package-lock.json`. The published site includes the unmodified WebAssembly runtime, the Wasmoon license and the Lua MIT license in `vendor/wasmoon/`. Wasmoon's JavaScript interface is bundled by Vite.

## IM FELL DW Pica

The roman and italic WOFF2 files are the subsets distributed by Florilegium, from Igino Marini's IM FELL DW Pica revival. Copyright (c) 2010 Igino Marini. They use the SIL Open Font License 1.1, without Reserved Font Names. The site includes the original `OFL.txt` and upstream font provenance in `fonts/`.

## Cyrillic calligraphy from Google Fonts

Great Vibes (The Great Vibes Pro Project Authors), Marck Script (Denis Masharov and Marck Fogel), and Bad Script (The Bad Script Project Authors) are distributed under the SIL Open Font License 1.1. The unmodified TTFs, original copyright/license notices and Google Fonts metadata are checked in under `assets/fonts/`, pinned to Google Fonts revision `86aced91de05cd4f96a06838124cca45be337b2b`. See `assets/fonts/README.md` for source links and checksums. The published site includes the complete notices alongside the fonts in `fonts/greatvibes/`, `fonts/marckscript/` and `fonts/badscript/`. SVG downloads using one of these fonts embed its unmodified file and full license notice.

## Lingdong Huang's orntxt.dh

The shape-fill engine is a TypeScript adaptation of [Lingdong Huang's `orntxt.dh`](https://github.com/LingDong-/dither-sketches/blob/8e7a1cbf91fa9736179eba0953e79dc49867f74a/orntxt.dh), revision `8e7a1cbf91fa9736179eba0953e79dc49867f74a`, from the [Non-Overlapping Floral Patterns](https://www.media.mit.edu/projects/non-overlapping-floral-patterns/overview/) project. Source SHA-256: `67dd9e4e73f5005e9c131f2652e3a171eae4e3be623c953417b0cf40f3292678`. It adapts the cell topology, route assignment, natural cubic vines, leaves, buds and fan-petal construction. Browser masks, D3 Voronoi geometry, application seeds, SVG output and whole-motif fitting are our integration changes. Dither's runtime and the original Caslon font are not bundled.

No explicit license was found in the reviewed `orntxt.dh`, repository tree or README. Applicable upstream reuse terms remain unspecified in the inspected material. Attribution is to Lingdong Huang; this repository's MIT license does not grant additional rights to the upstream-derived material. MIT Media Lab affiliation is not an MIT software license. The knowledge base records the source/dependency review and differences from the original program in `docs/knowledge/orntxt-code.md`.

## Research references

The related [`ornalt.dh`](https://github.com/LingDong-/dither-sketches/blob/8e7a1cbf91fa9736179eba0953e79dc49867f74a/ornalt.dh) presets source and project overview remain comparison references. The previous independent shape approximation has been replaced by the explicitly attributed `orntxt.dh` adaptation.

Additional conceptual references include Michael T. Wong, Douglas E. Zongker and David H. Salesin, [Computer-Generated Floral Ornament](https://doi.org/10.1145/280814.280948), SIGGRAPH 1998, and Walter Crane's [Line and Form](https://www.gutenberg.org/files/25290/25290-h/25290-h.htm). Research claims and implementation differences are documented in the repository's `docs/knowledge/` notes.

The build copies the license notices of installed runtime npm dependencies to `licenses/` and appends their exact versions below. Development tools remain recorded in `package-lock.json`.
