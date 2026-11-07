# Required visitors and linked flower colors

Implemented 2026-11-07 in `florilegium-continuous-v4`. The upstream pin remains `9fbaf56d53e6525e02da05cd802ea7da82052099`; vendor sources and the submodule are unchanged.

## Source observations

In pinned `florilegium-grow.lua:554`, a separate random stream samples whether visitors appear. Snails and birds have probabilities 0.4 and 0.22; density below 0.3 disables them altogether. Subsequent placement can also reject them for insufficient space. The former adapter only filtered sampled visitors, so an enabled UI button could produce nothing. `florilegium-native.lua:4666` exposes native visitor drawing, `florilegium-species.lua:807` exposes deterministic role sampling, and `florilegium-ink.lua:284` tracks conservative drawing bounds in PDF points.

## Our implementation and limits

`src/engines/page-visitors.ts` places exactly one native illustration for every selected type. Its independent seeds and canonical slots do not depend on selection order. Each illustration is measured and fitted within a rectangle in one of the four outer page bands, with clearance from both the page edge and the text reservation. Native visitor paint from probabilistic placement is suppressed; its layout-stream consumption is retained. Required visitors are appended above the plants and receive their own compact growth events. The result reports the actual drawn species. Disabling a visitor removes its illustration without changing plant geometry.

This guarantees presence and containment, not natural attachment to a stem or non-overlap with foliage. The types' positions are chosen independently of foliage occupancy; dense plants can appear underneath them. Native genomes still control details such as a butterfly's pose or a snail's withdrawn shell. Illustration size can shrink when the page's border is narrow.

The flower checkbox **Под цвет зелени** makes the existing bloom renderer use main ink as its base petal color. Shading, stamens and flower centers retain illustration details. Stored custom colors are preserved and restored when the checkbox is cleared. This is paint-only; random streams, geometry and event times are unchanged.

## Evidence

Wasmoon integration tests exercise all four UI visitor types together at seeds 1, 42 and 2147483646, minimum/full density, all seasons, and extreme text rectangles. They verify required types, no non-selected types, canonical selection order, repeatable SVG/events, and byte-identical plant geometry with visitors disabled. Each type is also generated alone. A separate comparison proves linked bloom color matches explicitly assigning the ink color and does not change paths or timing. The complete suite has 37 passing tests after extending the worker URL expectation to include locally hosted fonts.

The production `/floral-patterns/` preview was checked in installed Edge through Playwright; Browser plugin unavailable. All four actual native visitor bounds were measured in generated SVG coordinates and confirmed inside the page, outside the reserved rectangle and at visible sizes. None-selected, bird-only, and completed animated playback were checked. Desktop screenshots were inspected at 1440 by 1000; responsive controls and actual fit percentages were checked at widths 390 and 320. No relevant console warnings/errors or failed requests occurred. Other browser engines and remote deployment were not tested.
