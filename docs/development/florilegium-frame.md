# Florilegium A4 framing adapter

Implemented on 2026-11-06 as `florilegium-frame-v1`, using the unmodified Florilegium submodule at revision `9fbaf56d53e6525e02da05cd802ea7da82052099` (upstream release 2.0.1). The TypeScript entry point is [page-engine.ts](../../src/engines/page-engine.ts).

## Source behavior and our adaptation

Florilegium's supported [`florilegium-svg.page(options)`](../../florilegium/florilegium-svg.lua) function returns a page drawing from the actual Lua plant generator. Its composition fills the wider side margin and a footer, optionally continuing beneath a text block. A single upstream page therefore does not fill all four sides of an arbitrary reserved rectangle. See [`regions` in florilegium-grow.lua](../../florilegium/florilegium-grow.lua).

Our adapter calls that interface four times with deterministic related seeds and custom paper sizes. The left and right bands span the full A4 height; the top and bottom bands span the reserved rectangle's width. Rotated, cropped columns assemble a frame on a 210 × 297 mm sheet. The four panel rectangles do not overlap. They remain separate gardens: stems do not connect across panel boundaries, and rotation also rotates visitors. This is our composition method around the upstream generator, not an upstream full-frame algorithm.

The application bundles Wasmoon 1.16.0 and its Lua 5.4 WASM runtime locally. A dedicated worker loads the pinned Lua files from the site's own `vendor/florilegium/` directory. There are no runtime CDN requests. The submodule remains unchanged.

## Controls and reproducibility

The version 1 settings include a positive integer seed, rectangle coordinates in millimetres from the top-left corner, ink/accent/paper colors, density, season, and allowed visitor groups. The rectangle has a minimum size of 40 × 40 mm and keeps at least 18 mm of space on each page edge. These constraints leave enough room for the upstream stem composition. Density runs from 0.2 to 1.

The first panel uses the supplied seed; subsequent panel seeds advance by 104729 modulo 2147483646. SVG metadata includes the adapter version, exact upstream revision, and complete input settings. The export includes its paper color and physical A4 size; the editable rectangle guide belongs to the interface, not the artwork.

The upstream public interface has one visitor on/off switch. Our wrapper filters `florilegium-native.draw("visitor", ...)` by the sampled visitor's genome group, then restores the original function. It preserves the upstream layout and plant drawing when selections change; the space reserved for a disabled visitor remains empty. The seed determines whether an allowed visitor arrives. The butterfly group includes moths (`lepidoptera`). The complete engine API also supports dragonflies/damselflies, beetles, caterpillars, and flies for future interface controls.

Changing colors regenerates the same deterministic geometry. The wrapper reports upstream motif totals before cropping and upstream stem **sample points**, not visible-element counts or stem counts. Visitor summaries describe allowed arrivals before panel cropping. These statistics are useful as generation diagnostics rather than exact visible inventories.

## Runtime and verification

Superseding or cancelling a request terminates the busy worker, preventing stale Lua work from continuing. The next request starts a fresh runtime; a completed worker can be reused. Errors in source loading and Lua execution are returned explicitly. A 120-second timeout terminates a stalled request. The Lua stack is cleared after every panel and its garbage collector runs to avoid accumulating returned SVG strings.

The Node/Wasmoon integration tests execute the pinned Lua code and check four-panel output, a repeated deterministic panel, A4 dimensions, background and revision metadata, empty and selective visitor filtering, invalid-setting rejection, and the smallest supported panel. Default and maximum-area rectangle fixtures pass in summer. Independent transform/area checks confirm that the four clipping rectangles exactly partition the permitted page area, with no overlap into the reserved rectangle or each other. Worker-bridge tests check termination on cancellation, stale-result rejection, timeout/recovery, and project-subpath runtime URLs.

Browser loading, interaction, export, and project-subpath deployment require the application's browser smoke check; passing the Node tests alone is not evidence of those behaviors.

## Attribution

Florilegium is by Kevin Raymond. Retain its MIT license and the LPPL-1.3c exception for `florilegium-pgfmath.lua` with distributed source. Wasmoon carries its own license. See [third-party notices](../../THIRD_PARTY_NOTICES.md) and the upstream [citation](../../florilegium/CITATION.cff).
