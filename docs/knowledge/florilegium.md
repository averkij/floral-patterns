# Florilegium implementation reference

[Upstream](https://github.com/kevinraymond/florilegium), [playground](https://kevinraymond.github.io/florilegium/), [local submodule](../../florilegium).

Reviewed local revision `9fbaf56d53e6525e02da05cd802ea7da82052099` on 2026-11-06. The initial source review inspected documentation and code. Subsequent adapter work executes the real Lua modules in Wasmoon; implementation evidence and limitations are maintained in [the page experiment](../development/florilegium-frame.md). Upstream performance claims are not independently validated by that integration work.

## Source findings

The grown composition uses stems and a grid of free-space discs to place successively smaller motifs. Its proxies intentionally permit some overlap: this is not a strict non-overlap baseline. Species traits, seasonal appearance and rendering provide variation within a coherent composition. Separate random streams reduce interference between features. See [how it works](../../florilegium/docs/how-it-works.md).

The supported integration surface is the SVG command line or `require("florilegium-svg").page(options)`. The browser runs Lua 5.4 through Wasmoon in a worker. The upstream worker pins CDN JavaScript/WASM bytes and fetches the Lua modules relative to its location. The upstream Pages workflow copies both the web assets and Lua files into the deployment artifact. See [SVG and web documentation](../../florilegium/docs/svg-and-web.md).

## Code map

| File | Inspect for |
| --- | --- |
| [florilegium-grow.lua](../../florilegium/florilegium-grow.lua) | Free-space queries, proxies, attachment decisions |
| [florilegium-species.lua](../../florilegium/florilegium-species.lua) | Trait-based motif families |
| [florilegium-ink.lua](../../florilegium/florilegium-ink.lua) | Curves, paint and random streams |
| [florilegium-svg.lua](../../florilegium/florilegium-svg.lua) | SVG entry point |
| [worker.js](../../florilegium/web/worker.js) | Runtime loading and generation requests |
| [pages.yml](../../florilegium/.github/workflows/pages.yml) | Static artifact assembly |

## Current integration and findings

Update 2026-11-07, same pinned source: `species.sample` accepts fixed traits, `species.community` returns four plants, and exported `native.bloom` draws blossoms separately from cluster stalks. The application now uses these extension points for eight original illustrated flower varieties and separate bloom colors. These are our motifs, not eight named upstream species. Integration tests confirm that recoloring preserves every path and event. See [selection, source locators and evidence](../development/flower-selection.md).

The application wraps the supported SVG interface while keeping the submodule unchanged. A continuous A4 adapter supplies a union of four overlapping free-space rectangles around one reserved hole. These rectangles belong to a single field and share stems, branch placement and event scheduling; they are not separate rendered gardens. The source's `regions` and `field` functions already support a rectangle union, and `rects.corners = true` makes exposed corners constrain the free-disc radius.

Source inspection found that changing the field alone is insufficient: main stems are clamped to the original left column, the main-stem count depends on density, branch Béziers do not test an interior obstacle, and terminal flowers use fixed size ranges. Checked hooks in [page-lua.ts](../../src/engines/page-lua.ts) expose these decisions in the loaded runtime copy. Our [page-domain.ts](../../src/engines/page-domain.ts) supplies three routes from the original lower-left root samples, an obstacle-aware branch fallback and conservative terminal scaling. Native curves that fit remain unchanged; fallback routing calls the original branch function once to retain its random draw. The footer spans the page. A final exact exclusion clip protects the reserved rectangle; proxy geometry does not prove full motif containment.

The grower already tags stem and motif events. The adapter captures their final geometry once and maps the recorded event times to compact browser playback. This depicts the generator's event sequence; it does not expose the greedy solver's accepted and rejected candidates. Updating the pinned revision must remain a deliberate checkpoint because runtime hooks check specific source anchors.

Geometry tests execute the domain adapter in Wasmoon for central, maximal and offset exclusions. They check source-root retention, upward terminal direction, route containment, one native branch invocation and restoration of replaced functions. These checks complement, rather than replace, actual-generator integration tests and visual inspection. Test fresh worker startup, cancellation, load failure, repeated generation and built project-subpath loading before publication.

Upstream declares MIT with an LPPL-1.3c exception for `florilegium-pgfmath.lua`; fonts have separate notices. Preserve [LICENSE](../../florilegium/LICENSE), the exception's source header and [font notices](../../florilegium/web/fonts/README.md) when distributing relevant files. Use [CITATION.cff](../../florilegium/CITATION.cff) for attribution.
