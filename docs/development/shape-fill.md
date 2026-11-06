# Shape & type: independent partition-first experiment

Implemented on 2026-11-06 in [shape.ts](../../src/engines/shape.ts) and [shape-mask.ts](../../src/engines/shape-mask.ts). Engine identifier: `huang-inspired/1.0.0`. The browser demonstration fills a circle, arch, heart, drawn polygon or short piece of large type with vector floral ornament.

This is our independent implementation of ideas described in Lingdong Huang's [Filling Arbitrary Shapes with Non-Overlapping Procedural Floral Patterns](https://www.media.mit.edu/projects/non-overlapping-floral-patterns/overview/). No code from `ornalt.dh` has been copied or translated. The source project is an algorithmic reference, not a dependency or a claim of an exact reproduction. Our earlier [project note](../knowledge/huang-voronoi.md) and [Dither source review](../knowledge/ornalt-code.md) distinguish the article from its code snapshot; reuse terms for that code remain unresolved. Third-party dependency and font notices are recorded in [THIRD_PARTY_NOTICES.md](../../THIRD_PARTY_NOTICES.md).

## Implemented method

The pipeline has three broad phases: sample the region, build and route a cell scaffold, then construct and render motifs. The following details describe this repository's actual choices.

1. **Represent the region.** Render the selected silhouette into a binary browser-canvas mask whose longest dimension is at most 720 pixels. Keep a vector outline for export and contours for geometric intersection. Membership queries handle holes and disconnected regions. Text contours are described below.
2. **Place weighted samples.** Collect interior candidates on a three-pixel raster stride with approximately two pixels of boundary clearance. For each site, compare 20 seeded candidates and select the one with the largest minimum weighted distance to existing sites. The first six percent of sites (at least three) receive weight 2.7, reserving room before infill; fourteen percent of subsequent sites receive weight 1.95. This is best-candidate spacing, not a guaranteed minimum-distance Poisson process.
3. **Build and approximately clip cells.** `d3-delaunay` constructs the Voronoi diagram. For each cell, collect contained vertices and intersections with the region contours, then take their convex hull. The article describes this hull-based approximation. It is convenient for motif construction but can bridge a concavity or a hole.
4. **Relax shared corners.** Deduplicate cell corners and build a second Voronoi diagram using them as sites. Apply two small centroid-attraction steps, with repulsion from heavy sites. Boundary corners stay fixed. Interior moves are limited to 2.2 artwork units per iteration and must remain in the raster mask. These constants are our implementation choices.
5. **Route a spanning forest.** Walk the cell-edge graph, favoring smaller turns with a slight directional bias. Stop overly sharp paths, occasionally end a path beside a heavy cell, and branch from existing routes before starting disconnected routes. Edge membership is sampled at the mask's resolution, both before and after relaxation, to reject paths through counters and gaps. Routes are interpolated with cubic curves derived from adjacent polyline points. We do not implement the author's Hobby-spline or natural-cubic variants.
6. **Assign and draw motifs.** At vine endpoints, score neighboring cells by area, incoming direction and weight. Large heavy cells are also eligible flowers. Rank these candidates by size to reserve approximately twenty percent of all cells for prominent blooms, plus a small group of pale blossoms. Remaining cells receive leaves using a routed edge and a distant vertex; cells without such an edge receive a detached leaf. Prominent flowers use five to seven broad, ray-fitted Bézier petals; smaller flowers have two petal layers. Both include veins, centers and stamens. Leaves have curved outlines and branching veins. These procedural drawings and the flower budget are our own choices. The current engine does not reproduce all four original motif categories or the source presets.
7. **Render SVG.** Draw vines, then motifs clipped to slightly inset cell polygons, all under an even-odd silhouette clip. Optional diagnostic lines show the relaxed cells and sample sites. The output includes vector geometry, colors, a background and metadata; it requires no runtime, image fetch or font fetch to display.

The shared library supplies the triangulation and rectangular Voronoi bounds; see the [D3 Voronoi documentation](https://d3js.org/d3-delaunay/voronoi). Mask tracing, graph traversal, motif construction and SVG assembly live in our engine.

## Controls and reproducibility

| Input | Implemented behavior |
| --- | --- |
| Seed | The version and seed initialize a layout stream; each cell receives a separate motif-detail stream. The same complete settings and raster mask reproduce the same SVG. |
| Density | Rounded and clamped to 60–260 requested sites. Tiny masks and candidate exhaustion may produce fewer usable cells. The displayed cell count is the actual count. |
| Flower scale | Clamped to 0.65–1.5. Changes petal geometry while retaining samples, routes, cell assignments and leaf geometry. Growth is limited by each cell, so large values can produce clipped petals rather than expand the layout. |
| Ink, accent, paper | Derived tints color stems, leaves and flowers. Recoloring preserves all geometry. Invalid engine-level colors fall back to a valid palette. |
| Region and type | Changing the silhouette changes candidate locations and therefore the composition. The UI accepts a short word; one or two broad letters usually leave more room for detailed motifs. |
| Cell overlay | Adds the current scaffold and weighted sample markers without changing the composition. |

The application stores versioned settings, including the drawn points, in its shared URL. The SVG contains engine metadata and the actual silhouette path. Its metadata does not substitute for the full application configuration: retain the share link when continuing an experiment. `generationMs` measures engine work only; canvas-mask creation and browser SVG painting are outside that timing.

Changing density can change both allocation and routes. Changing flower scale does not enlarge the reserved cells. A seed alone is not a complete reproducibility record: keep the algorithm version, dimensions, all settings and, for exact cross-platform comparison, the resulting mask or exported SVG.

## Text contours and export

The app waits for its bundled `Floralia Serif` font before generating serif masks. The helper uses canvas text metrics to center and fit the text, thresholds its alpha channel, traces directed pixel boundary loops, and simplifies those loops using Douglas–Peucker reduction. Counters and disconnected glyph components remain separate contours, rendered with an even-odd fill rule.

The exported text silhouette is an SVG path, not a live `<text>` element or an embedded raster image. The recipient therefore does not need the font to view the result. The internal sampling raster is not included in the SVG.

This is outline extraction at a finite resolution, not an original-font-outline parser. Very small details can disappear, and contours can have slight faceting at extreme zoom. Text rasterization may differ across browsers or operating systems. The bundled serif reduces font substitution; a system sans-serif choice can differ between machines. The already exported SVG remains self-contained in either case.

## Practical limitations and next experiments

- **Containment and non-overlap:** final SVG clipping preserves the visible silhouette, including counters. Hulls, relaxed cell geometry and interpolated vines are approximations. Curves can enter neighboring allocations or pass outside the mask before clipping. We do not claim mathematically certified non-overlap or stroke-aware geometric containment.
- **Disconnected and narrow regions:** separated components can produce independent vines. The sampler does not promise a site in every tiny island. Features below the raster clearance can remain empty; empty or unusably thin masks report a clear error instead of looping indefinitely.
- **Boundary appearance:** a cell crossing a concavity can be clipped into disconnected fragments. Large petals or sharp corners can be visibly cropped. A robust polygon-intersection implementation and curve-clearance checks would address geometry, rather than merely hiding it.
- **Density and hierarchy:** a larger requested count means more, smaller allocations. Early heavy samples and a prominent-flower budget improve size contrast, but narrow letter strokes limit how large a flower can become. The assignment does not optimize a single global aesthetic score.
- **Browser cost:** the app creates the canvas mask on the main thread, then runs generation in [shape-worker.ts](../../src/engines/shape-worker.ts). Settings changes terminate the obsolete worker; a 30-second timeout reports failure. Sample counts, mask dimensions, candidate attempts, relaxation steps and route lengths are bounded, but mask extraction and SVG painting still cost main-thread time.
- **Method development:** useful next comparisons are concave masks, narrow necks, disconnected dots, large counters, multiple fixed seeds, and different motif families with a frozen scaffold. Treat candidate improvements as hypotheses until tested.

## Verification

[shape.test.ts](../../src/engines/shape.test.ts) checks deterministic SVG generation, seed sensitivity, geometry-preserving recoloring, flower-scale changes that retain the scaffold, numeric-control normalization, even-odd counters, bounded disconnected-region generation, and empty/thin-mask errors. These are algorithm regression checks; they do not establish visual quality or strict geometric non-overlap. Browser, export and GitHub Pages checks belong to the application validation record.
