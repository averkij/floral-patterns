# Demo experiments

Status updated 2026-11-06: the first three investigations now have initial interactive implementations across **Page garden** and **Shape & letter**. Fine-grained growth instrumentation and comparative quality evaluation remain research work. Deployment target: [GitHub Pages](github-pages.md); a live publication has not been verified. The questions below are our synthesis of the [knowledge base](../knowledge/README.md).

## Implementation status and next questions

| Order | Investigation | Current implementation | Next research |
| --- | --- | --- | --- |
| 1 | Floral specimen desk | **Initial demo:** actual Florilegium Lua in a worker; seed, palette, season, visitors, A4 frame, SVG export and shared settings. **2026-11-07:** eight selectable illustrated flower varieties with independent default/editable colors; [selection and limits](flower-selection.md). | Compare composition quality across fixed seeds and rectangle proportions. |
| 2 | Watch a page grow | **Initial growth baseline:** one continuous A4 field around an editable exclusion, using Florilegium's native orientation and one compact event timeline. Watch growth and replay use the applied seed. See [adapter evidence](florilegium-frame.md). | Step/pause, free-disc overlays and accepted/rejected proposal inspection remain research. Study branch continuity, coverage and boundary fit around narrow corners. |
| 3 | Flowers inside a letter | **Source-based port:** Lingdong Huang's `orntxt.dh` topology, routing and motifs adapted to TypeScript; preset/freehand masks, large lettering, density, flower scale and cell overlay. [Provenance and differences](../knowledge/orntxt-code.md). | Compare complete-motif fitting with source output; quantify containment and overlap; inspect routing and difficult silhouettes. |
| 4 | One vine, several voices | **Proposed.** Color changes preserve the seeded geometry in the current demos. | Compare outline, flat color, tapered ink and wash renderers on a frozen scene. |
| 5 | Living borders and wallpaper | **Proposed.** | Add repeat units, symmetry and spacing controls; inspect seams in a 3-by-3 neighborhood. |

A later hybrid could reserve a few large flowers, route a coherent vine skeleton, then grow smaller leaves into remaining gaps. This remains an untested hypothesis. Compare the existing growth and partition baselines before combining them.

## Common experiment contract

Each demo should save an algorithm/version identifier, seed, dimensions, parameters and any relevant upstream revision. A shared link must reconstruct those inputs. Keep named presets as data, so they can become comparison fixtures.

The current interface separates editing from generation: initial load, seed/settings changes, rectangle manipulation and freehand drawing prepare a draft. **Grow pattern** explicitly applies it, with a busy spinner during computation/playback. The canvas offers Fit and 25–200% preview zoom; scrolling and zoom do not change export dimensions. Include this draft/apply behavior in interaction checks so dragging cannot silently regenerate a specimen.

The 2026-11-07 interface cleanup applies to both demos: the masthead contains only **Algo Floral Patterns**, and the workspace headings, preview toolbar, ruler, specimen labels/captions, empty-canvas copy, footer and visible status bar are removed. Zoom controls sit inside the canvas at its top right and remain reachable while scrolling. Fit is the default and uses the available width and viewport height without the former specimen-size caps; explicit zoom changes center the artwork horizontally. Generation failures appear beside the controls, and progress remains available to screen readers. Typecheck, 30 tests and the production build passed. The built `/floral-patterns/` preview was checked in Edge at 1440 × 1000, 390 × 844 and 320 × 844: both demos generated/exported successfully, fit size matched available space, zoom levels 25–200% stayed centered, controls remained reachable during scrolling, and zoom left SVG contents unchanged. Screenshots were reviewed; no application console errors or failed requests occurred. Remote deployment and other browser engines were not tested.

For new engines, separate region representation, layout, motif construction and rendering. An inspectable scene should identify elements, their parents/attachments, geometry and bounds. Give layout and visual detail separate random streams. Recoloring should not silently regenerate the composition.

SVG is the implemented export target. Letter masks are rasterized and converted to self-contained vector contours before generation; resulting exports preserve the selected silhouette without requiring its font. PNG export can follow when useful. The application uses React, TypeScript and Vite with browser-side worker generation.

Run expensive work in a worker where needed. Tag requests so stale responses cannot replace newer settings. Provide visible progress/failure states and bounded work; distinguish cancellation from merely ignoring an obsolete result.

## Compare quality without reducing it to one number

| Dimension | Proposed check |
| --- | --- |
| Containment | Detect marks outside the allowed region, including holes and stroke extents; distinguish clipping from valid geometry. |
| Overlap | Report motif/motif and vine/motif overlap separately, with an explicit allowance for intentional layering. |
| Coverage | Inspect a coarse occupancy map and large empty regions; leave room for deliberate whitespace. |
| Hierarchy | Compare motif-size distributions and inspect reduced-size silhouettes. |
| Continuity | Inspect attachment directions, sharp turns, disconnected parts and unintended crossings. |
| Repeat quality | Compare opposite tile edges and inspect a repeated neighborhood. |
| Reproducibility | Regenerate recorded inputs; compare scene data or canonical SVG where supported. |
| Browser cost | Record generation time, output size and repeated-generation memory behavior on a named browser/device. |

Avoid claiming mathematical non-overlap from a visually pleasing example or a proxy check alone. Compare multiple fixed seeds and masks, including a rectangle, circle, crescent, narrow neck, letter counter and disconnected islands. Empty/tiny regions should terminate clearly.

## Completion checkpoint for each demo

Keep a short README with the experiment's question, source credits, controls, known limitations, reproducible presets and validation performed. Check desktop and narrow-screen layout, keyboard access to controls, download behavior, shared-state reload, and asset loading under the project URL. Preserve a few representative outputs for review, update these notes with findings, then commit the verified checkpoint.
