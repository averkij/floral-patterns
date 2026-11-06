# Shape & type: orntxt.dh port

Updated 2026-11-06. The Shape & letter demo adapts Lingdong Huang's [`orntxt.dh`](https://github.com/LingDong-/dither-sketches/blob/8e7a1cbf91fa9736179eba0953e79dc49867f74a/orntxt.dh) typography program at revision `8e7a1cbf91fa9736179eba0953e79dc49867f74a`. Engine identifier: `orntxt-port/1.0.0`. This replaces our earlier independent approximation. Geometry lives in [shape-orntxt.ts](../../src/engines/shape-orntxt.ts); [shape.ts](../../src/engines/shape.ts) provides the application interface and SVG rendering, and [shape-mask.ts](../../src/engines/shape-mask.ts) supplies masks and contours.

The [source review](../knowledge/orntxt-code.md) records the exact hash, function locators and dependency chain. This is a source-derived port with browser adaptations, not exact Dither execution. The Dither runtime and original Caslon font are not bundled. Attribution and the absence of established upstream reuse terms are recorded in [THIRD_PARTY_NOTICES.md](../../THIRD_PARTY_NOTICES.md).

## Ported structure

The port retains the source's main sequence and recognizable function boundaries:

1. Place weighted best-candidate samples: sixteen candidates per site; the first ten percent receive weight 2 to reserve larger allocations.
2. Construct Voronoi cells, approximately intersect them with the mask using convex hulls, and deduplicate eligible interior corners into a graph.
3. Relax corners three times with centroid attraction and repulsion from heavy sites; recompute cell geometry and centers.
4. Walk a spanning forest with asymmetric turn bounds and the first eligible neighbor. Heavy cells start or end routes. Other endpoints can receive buds; routed edges select leaf attachments and far vertices.
5. Solve natural cubic Bézier vines. Construct paired-cubic leaves and veins, paired-ellipse buds, and three-cubic fan petals. A flower faces inward from its attachment, with ray-fitted, shortened and shuffled petals. Unassigned cells receive fallen petals.
6. Render complete vector motifs and outlined vines, with optional cell diagnostics. Oversized petals are no longer sliced by per-cell SVG clips.

This replaces the former generic radial flowers and separately chosen flower budget. The presets demo `ornalt.dh` is a related reference, not the program being ported here.

## Browser adaptations

| Area | Difference from the original program |
| --- | --- |
| Region | The source uses one dilated Caslon “A”. The app accepts preset shapes, freehand polygons or short text. Canvas masks and extracted contours replace Dither font decoding, image tracing and fixed glyph dilation. |
| Sampling | The source derives count from glyph area and retries points until they fall inside. Bounded density and finite candidates make tiny or empty regions terminate. |
| Geometry | D3 replaces Dither's Voronoi implementation. Cell order, outer bounds and numeric precision can change routes. |
| Randomness | Application seeds and separate detail streams replace Dither's RNG; identical seed numbers do not imply identical source output. |
| Traversal | Iterative walking bounds stack use. Mask checks reject graph edges through counters or disconnected gaps. |
| Curves | SVG retains Bézier geometry instead of only the source's sampled rendering polylines. |
| Fitting | Complete motifs are reduced or omitted when sampled cell/mask checks fail. Unsafe natural cubic vine controls can be tightened, or a segment omitted. Fitted leaves receive a short connection to a nearby vine when a safe connection exists. These steps are our containment adaptations. |
| Application | Palette controls, workers, diagnostics, versioned shared settings and SVG export are integration features. |

The source renders without per-cell or silhouette clipping. Neither its ray-fitting strategy nor our finite fitting checks prove global non-overlap. Approximate hulls can bridge concavities, relaxation can change convexity, and sampling cannot certify exact curve/stroke clearance everywhere.

The version 1 fitting pass finds a safe maximum independently of the flower-scale control: it starts at 1.5, tries at most twenty-two reductions by a factor of 0.9, then refines the fitting bracket five times. It uses the smaller of the requested size and that maximum, rechecking the result for non-star-shaped masks with at most twelve further inward reductions. This prevents a larger requested size from accidentally selecting a smaller discrete fallback. Sampled curves use 1.1 artwork units of clearance, with additional filled-interior mask checks for enclosed counters. A motif that still fails is omitted as a whole. SVG metadata records fitted and rejected counts alongside the source revision, settings and mask path.

## Why complete-motif fitting matters

The old engine clipped enlarged flowers against inset polygons, producing flat cuts through petal outlines. The replacement creates the author's attached fan geometry first, then tests the complete motif. A reduced flower keeps all its paths together; rejection leaves empty space rather than a sliced fragment.

The tradeoff is smaller motifs or reduced coverage in narrow cells. Shrinking around a cell center changes the distance to the original vine attachment; the adapter reconnects fitted leaves to a nearby vine where a mask-safe connection is available. Inspect connection quality as well as containment. Future work can preserve original attachments during fitting, improve polygon intersection and measure stroke-aware clearance.

## Controls and reproducibility

Seed, density, flower scale, palette and cell overlay remain available. Flower scale changes motif geometry inside the allocated scaffold; fitting limits its effective size. Density changes allocations and routes. Recoloring preserves geometry.

Settings and masks are drafts until **Grow pattern** is pressed. Initial load and freehand drawing do not start generation. The busy indicator covers computation; Fit and 25–200% zoom only affect the scrollable preview, leaving the mask's artwork coordinates and export dimensions unchanged.

Shared URLs store versioned application settings, including freehand points. SVG metadata records the engine and source revision, and export includes the paper color and vector contours. Retain all settings and the mask or resulting SVG for reproducibility. A seed alone is insufficient, especially across the change from the independent engine to this port.

For lettering, the browser waits for its bundled serif, fits text using canvas metrics, traces thresholded alpha boundaries and simplifies the contours. Counters and disconnected components remain separate. Exported letters are paths and need no font download. Finite rasterization can differ between browsers; the system sans face can also differ between machines.

## Validation and remaining questions

[shape.test.ts](../../src/engines/shape.test.ts) covers deterministic generation, seed sensitivity, palette changes, scaffold stability, numeric normalization, counters, disconnected regions and empty/thin-mask errors. Port-specific checks verify the three-cubic petal control points, natural cubic continuity, absence of SVG clipping, sampled motif/vine containment, and flower-scale monotonicity on a solid fixture. Concave-mask cases exercise maximum flower scale at low/high density. Tests do not establish aesthetic quality or strict non-overlap.

Compare fixed seeds with the author's [floral specimen](https://dam-prod.media.mit.edu/thumb/2026/07/21/Screenshot%202026-06-23%20at%206.24.51PM.png.1400x1400.png) and [typography sheet](https://dam-prod.media.mit.edu/thumb/2026/07/21/Screenshot%202026-07-21%20at%203.13.54PM.png.1400x1400.png). These copyrighted references remain outside the repository. Inspect broad/narrow letters, concavities, counters and disconnected regions, checking complete petals, leaf attachment, buds, vine continuity, whitespace and size hierarchy.

Generation runs in [shape-worker.ts](../../src/engines/shape-worker.ts); mask creation and SVG painting remain main-thread work. Superseded workers are terminated and generation is bounded. Browser interactions, exports, shared-state reload and `/floral-patterns/` asset loading require the application's built-output smoke check. Record that evidence at the implementation checkpoint.
