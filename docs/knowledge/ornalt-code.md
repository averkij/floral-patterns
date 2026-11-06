# Reading ornalt.dh

[User-supplied source](https://github.com/LingDong-/dither-sketches/blob/main/ornalt.dh). Reviewed revision [`8e7a1cbf91fa9736179eba0953e79dc49867f74a`](https://github.com/LingDong-/dither-sketches/blob/8e7a1cbf91fa9736179eba0953e79dc49867f74a/ornalt.dh) on 2026-11-06. The pinned file matched the downloaded `main` file byte for byte; SHA-256: `ce8f4782c48805d2b5134d103f931c190b240f6a1d88d8862cfd76a057d933c2`.

This is Dither source, not browser JavaScript. It was inspected, not compiled or run.

## Source observations

Line numbers below refer to the pinned file.

| Lines / symbol | Observation |
| --- | --- |
| 18-25, `pt_in_clipshape` | Even-odd membership across polygon contours. |
| 41-60, `poisson_sample` | Sixteen candidates per sample; maximize minimum distance divided by existing sample weight. No explicit hard minimum distance. |
| 65-102, `convexclip` | Convex-hull clipping approximation. |
| 388-480, `walk`, `walk_all` | Traverses the first eligible neighbor under asymmetric turn bounds; does not globally rank all turns as the overview suggests. |
| 483-503, `relax` | Centroid attraction plus repulsion from heavy sites. |
| 1162-1285, `process` | Starts with 200 samples, 10% weighted 2; filters by mask, builds cells, relaxes three times, routes and assigns endpoints. |
| 1305-1410 | Assigns leaves, smooths vines, creates motifs and fallback petals; returns five geometry lists. |
| 1415-1537 | Rendering is separate; three presets reset the same seed, `0x5EED`. |

The overview and this snapshot should not be treated as identical specifications.

## Proposed port boundaries

Use explicit stages: sampling, clipping, adjacency, relaxation, routing, assignment, geometry and rendering. Preserve intermediate results for inspection. Replace global mutable state with a per-generation context and seeded random streams.

The first browser experiment used an independent TypeScript approximation. Following the user's explicit request, the replacement ports the related typography demo, `orntxt.dh`, rather than this presets program. See [the source and dependency review](orntxt-code.md) and [implementation record](../development/shape-fill.md). The two files remain distinct references.

No reuse license was established from the inspected source and README; a root `LICENSE` URL returned 404. That does not prove no license exists elsewhere. The later `orntxt.dh` review also inspected the tracked repository tree and records the source-derived port's provenance separately. The MIT project affiliation is not an MIT software license.
