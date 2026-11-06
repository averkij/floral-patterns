# Demo experiments

Status: proposed on 2026-11-06. No demos are implemented yet. Deployment target: [GitHub Pages](github-pages.md). The following designs are our synthesis of the [knowledge base](../knowledge/README.md), not claims that these experiments already work.

## Suggested sequence

| Order | Demo | Question | Controls and evidence |
| --- | --- | --- | --- |
| 1 | Floral specimen desk | Can we quickly obtain reproducible, exportable browser results through Florilegium's supported interface? | Seed, palette, season, page proportions; SVG export and shareable settings; startup/error handling and subpath smoke test. |
| 2 | Watch a panel grow | How does empty-space selection influence hierarchy? | Seed/root, density, minimum size and region; step/pause, free-disc/proxy overlays, accepted/rejected proposals. Build a small independent generator for this instrumentation. |
| 3 | Flowers inside a letter | How does partition-first composition behave in difficult silhouettes? | Mask, sample count, flower-size bias, turn preference and relaxation; cell/graph overlays, containment and overlap reports. Resolve the implementation and reuse route before porting code. |
| 4 | One vine, several voices | Which visual changes come from rendering versus layout? | Freeze geometry; switch outline, flat color, tapered ink and wash styles. Export each from the same scene. |
| 5 | Living borders and wallpaper | Can motifs repeat without obvious seams or accidental stripes? | Start with bands, then plane tiles; symmetry and spacing controls; 3-by-3 repeat preview and seam inspection. |

A later hybrid could reserve a few large flowers, route a coherent vine skeleton, then grow smaller leaves into remaining gaps. This is an untested hypothesis; establish the two independent baselines before combining them.

## Common experiment contract

Each demo should save an algorithm/version identifier, seed, dimensions, parameters and any relevant upstream revision. A shared link must reconstruct those inputs. Keep named presets as data, so they can become comparison fixtures.

For new engines, separate region representation, layout, motif construction and rendering. An inspectable scene should identify elements, their parents/attachments, geometry and bounds. Give layout and visual detail separate random streams. Recoloring should not silently regenerate the composition.

Use SVG as the first export target for vector demos. Canvas is available for interactive previews or expensive paint effects; report any export differences. PNG export can follow when useful. Select a framework only when the first demo needs one; TypeScript with a small static build is a candidate, not an existing dependency.

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
