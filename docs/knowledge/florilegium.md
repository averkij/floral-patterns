# Florilegium implementation reference

[Upstream](https://github.com/kevinraymond/florilegium), [playground](https://kevinraymond.github.io/florilegium/), [local submodule](../../florilegium).

Reviewed local revision `9fbaf56d53e6525e02da05cd802ea7da82052099` on 2026-11-06. Documentation and code were inspected; runtime behavior and upstream performance claims were not independently benchmarked.

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

## Proposed use here

Start with an adapter around the supported SVG interface. Keep experiments outside the submodule; updating its pinned revision should be a deliberate checkpoint. Record the upstream revision with every reproducibility fixture.

Test fresh worker startup, rapid successive requests, load failure, regeneration memory use and project-subpath loading before reusing this approach. Do not assume its worker can report internal growth steps without additional instrumentation.

Upstream declares MIT with an LPPL-1.3c exception for `florilegium-pgfmath.lua`; fonts have separate notices. Preserve [LICENSE](../../florilegium/LICENSE), the exception's source header and [font notices](../../florilegium/web/fonts/README.md) when distributing relevant files. Use [CITATION.cff](../../florilegium/CITATION.cff) for attribution.
