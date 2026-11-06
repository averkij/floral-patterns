# Third-party notices

Floralia is an independent experimental interface. Source attributions do not imply endorsement by the referenced authors or institutions.

## Florilegium

The page composition demo runs Kevin Raymond's [Florilegium](https://github.com/kevinraymond/florilegium) Lua modules, copied without modification from the pinned submodule revision [`9fbaf56d53e6525e02da05cd802ea7da82052099`](https://github.com/kevinraymond/florilegium/tree/9fbaf56d53e6525e02da05cd802ea7da82052099), version 2.0.1.

Copyright (c) 2026 Kevin Raymond. Florilegium is distributed under the MIT license, except `florilegium-pgfmath.lua`, which is distributed under the LaTeX Project Public License 1.3c. The latter reimplements part of pgfmath and preserves its complete upstream attribution and maintenance notice in its source header. It is not part of PGF. Our adapter does not modify these modules.

The built site includes the source modules and notices in `vendor/florilegium/`: `LICENSE`, `PGFMATH-NOTICE.txt`, `LPPL-1.3c.txt`, and the original Lua source files.

## Lua and Wasmoon

The browser runs Lua through [Wasmoon](https://github.com/ceifa/wasmoon), copyright (c) 2023 Gabriel Francisco, MIT license. Its version is fixed by `package-lock.json`. The published site includes the unmodified WebAssembly runtime, the Wasmoon license and the Lua MIT license in `vendor/wasmoon/`. Wasmoon's JavaScript interface is bundled by Vite.

## IM FELL DW Pica

The roman and italic WOFF2 files are the subsets distributed by Florilegium, from Igino Marini's IM FELL DW Pica revival. Copyright (c) 2010 Igino Marini. They use the SIL Open Font License 1.1, without Reserved Font Names. The site includes the original `OFL.txt` and upstream font provenance in `fonts/`.

## Research references

The shape-fill experiment is an independent implementation informed by Lingdong Huang's [Non-Overlapping Floral Patterns](https://www.media.mit.edu/projects/non-overlapping-floral-patterns/overview/) project and the documented partition-first method. The related [`ornalt.dh`](https://github.com/LingDong-/dither-sketches/blob/8e7a1cbf91fa9736179eba0953e79dc49867f74a/ornalt.dh) source was studied as a reference. The absence of an established reuse license for that file is recorded in our knowledge base; it is not copied or bundled here. MIT Media Lab affiliation is not a software license.

Additional conceptual references include Michael T. Wong, Douglas E. Zongker and David H. Salesin, [Computer-Generated Floral Ornament](https://doi.org/10.1145/280814.280948), SIGGRAPH 1998, and Walter Crane's [Line and Form](https://www.gutenberg.org/files/25290/25290-h/25290-h.htm). Research claims and implementation differences are documented in the repository's `docs/knowledge/` notes.

The build copies the license notices of installed runtime npm dependencies to `licenses/` and appends their exact versions below. Development tools remain recorded in `package-lock.json`.
