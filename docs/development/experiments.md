# Demo experiments

Status updated 2026-11-07: the first three investigations now have initial interactive implementations across **Сад на странице** (Page garden) and **Форма и буква** (Shape & letter). Fine-grained growth instrumentation and comparative quality evaluation remain research work. Deployment target: [GitHub Pages](github-pages.md); a live publication has not been verified. The questions below are our synthesis of the [knowledge base](../knowledge/README.md).

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

Persistence fix, 2026-11-07: after copying a shared link and then editing, localStorage held the new draft but the URL still contained the old one. Reload gave the stale URL priority and reverted density (reproduced: cached 30%, shared 20%, reloaded 20%). Saving now also replaces an active `#studio=` fragment with the current draft without adding history entries. Clean URLs stay clean; deliberately opening an older shared link still imports its settings. Both density sliders, text/font settings, mobile reload and reopening with saved localStorage were checked against the built project-subpath preview. Both demos generated/exported successfully, with no console errors or failed assets. Typecheck/build and all 39 tests passed.

The latest 2026-11-07 controls use the tabs **Цветочник** and **Заполнение формы**. **Под цвет зелени** links bloom colors to main ink while retaining custom colors. Selected objects now appear on every generated page, with the v4 adapter and [documented placement limits](selected-visitors.md). Automatic fit remains the default, but the zoom selector displays its measured percentage instead of “Вписать”.

Page text now has a point-size selector (10–64 pt) and Georgia plus three locally hosted Cyrillic Google Fonts: Great Vibes, Marck Script and Bad Script. Text size is the maximum requested size; overlong text still scales down to fit its reservation. Wrapping uses checked-in font metrics for the three bundled fonts, with kerning/ligatures disabled consistently in preview and export. The chosen font and its OFL license are embedded in SVG exports; no Google CDN request occurs during use. Existing local/shared states default to Georgia and 14 pt. [Font provenance and metric regeneration](../../assets/fonts/README.md) record the pinned sources and glyph coverage checks.

Typecheck/build and 37 tests passed. The built project-subpath browser check verified live font/size changes, all three Cyrillic fonts, linked color changes and restoration, persisted/shared settings with identical regenerated SVG, complete visitor selection, animation, actual zoom percentages, mobile controls and the second demo's generation/export. An exported Great Vibes SVG was opened in a fresh browser context with HTTP requests blocked and its embedded font loaded successfully. Screenshots of all three text styles, mobile controls and the standalone export were reviewed. Embedded-font rendering in third-party SVG editors has not been verified.

Each demo should save an algorithm/version identifier, seed, dimensions, parameters and any relevant upstream revision. A shared link must reconstruct those inputs. Keep named presets as data, so they can become comparison fixtures.

The current interface separates editing from generation: initial load, seed/settings changes, rectangle manipulation and freehand drawing prepare a draft. **Grow pattern** explicitly applies it, with a busy spinner during computation/playback. The canvas offers Fit and 25–200% preview zoom; scrolling and zoom do not change export dimensions. Include this draft/apply behavior in interaction checks so dragging cannot silently regenerate a specimen.

The 2026-11-07 interface cleanup applies to both demos: the masthead contains only **Algo Floral Patterns**, and the workspace headings, preview toolbar, ruler, specimen labels/captions, empty-canvas copy, footer and visible status bar are removed. Zoom controls sit inside the canvas at its top right and remain reachable while scrolling. Fit is the default and uses the available width and viewport height without the former specimen-size caps; explicit zoom changes center the artwork horizontally. Generation failures appear beside the controls, and progress remains available to screen readers. Typecheck, 30 tests and the production build passed. The built `/floral-patterns/` preview was checked in Edge at 1440 × 1000, 390 × 844 and 320 × 844: both demos generated/exported successfully, fit size matched available space, zoom levels 25–200% stayed centered, controls remained reachable during scrolling, and zoom left SVG contents unchanged. Screenshots were reviewed; no application console errors or failed requests occurred. Remote deployment and other browser engines were not tested.

For new engines, separate region representation, layout, motif construction and rendering. An inspectable scene should identify elements, their parents/attachments, geometry and bounds. Give layout and visual detail separate random streams. Recoloring should not silently regenerate the composition.

The subsequent inspector redesign translates the interface to Russian, including the masthead **Алгоритмические цветочные узоры** and explicit **Создать узор** action. It removes helper paragraphs and replaces the former editorial styling with compact bordered groups, segmented choices, illustrated flower toggles and system typography. Fit and centered zoom remain available in both demos. See the [inspector verification](flower-selection.md#compact-russian-inspector) for production-browser evidence and limitations. Configuration keys, seeds and engine identifiers remain stable; text masks use a Cyrillic-capable system serif fallback, so mask contours can still differ across operating systems.

The next 2026-11-07 checkpoint renames the studio **Flower Power**, the season group **Стиль**, and the reserved rectangle **Область текста**. Visitors move to **Объекты**, with four original illustrated toggle buttons and no color inputs. New page configurations default to 80% density; saved and shared densities remain intact. Both demo configurations, the active tab and the animation preference persist in versioned localStorage on the same origin. Valid shared links take priority, malformed links fall back to the saved draft, and corrupt/unavailable storage falls back safely. Loading settings still does not generate a pattern automatically.

Plain text can be entered directly inside the page rectangle or focused with **Редактировать текст**. It is included in local drafts and shared links, and exported as escaped SVG text after **Создать узор**. The 2,000-character input supports newlines, conservative word wrapping and automatic size reduction; preview and export share the same layout. This is plain text, not rich text. Text uses the system Georgia/serif stack, so exact glyph metrics can differ across devices; very long text in a small rectangle becomes small. Text editing leaves rectangle border dragging and corner resizing available. Text is separate from the floral random stream and does not affect plant geometry.

Typecheck/build and all 34 tests passed. Playwright with installed Edge checked the built `/floral-patterns/` route (Browser plugin unavailable): new labels/defaults, illustrated visitor buttons and keyboard toggles, both-demo persistence including text and animation, shared-link precedence, invalid/blocked storage, text editing and SVG escaping/export, deterministic shared regeneration, centered zoom, and 390/320-pixel mobile layouts. A further 1280-by-800 check exercised pointer movement/resizing around the editor, long-text bounds inside a minimum-size rectangle, and completed growth playback with text. Screenshots were reviewed, with no console errors/warnings or failed requests. Remote deployment and other browser engines remain untested.

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

## Independent page text color

The text area now has a color picker beside its font and size controls. Text defaults to black, including when importing older links or drafts, and stays independent of floral palette changes. The selected color persists in local storage and shared links and is applied to the editor, live preview, animation and SVG export without changing floral geometry. Typecheck/build and all 40 tests passed. Edge smoke checks of the built `/floral-patterns/` route verified default and custom colors, palette independence, local/shared reloads, SVG download, and desktop/320-pixel layouts without failed requests or page errors.

## Completion checkpoint for each demo

Keep a short README with the experiment's question, source credits, controls, known limitations, reproducible presets and validation performed. Check desktop and narrow-screen layout, keyboard access to controls, download behavior, shared-state reload, and asset loading under the project URL. Preserve a few representative outputs for review, update these notes with findings, then commit the verified checkpoint.
