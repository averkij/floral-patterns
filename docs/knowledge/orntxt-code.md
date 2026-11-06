# Reading and porting orntxt.dh

Reviewed 2026-11-06 at [`8e7a1cbf91fa9736179eba0953e79dc49867f74a`](https://github.com/LingDong-/dither-sketches/blob/8e7a1cbf91fa9736179eba0953e79dc49867f74a/orntxt.dh), the current `main` revision at review time. The pinned and `main` raw downloads matched: 975 lines; SHA-256 `67dd9e4e73f5005e9c131f2652e3a171eae4e3be623c953417b0cf40f3292678`. The [project overview](https://www.media.mit.edu/projects/non-overlapping-floral-patterns/overview/) links this file as its font demo. It is distinct from the previously reviewed [ornalt.dh presets](ornalt-code.md).

The user requested a source-based TypeScript port. This changes our provenance from the earlier independent approximation: the replacement derives its routing and motif construction from Lingdong Huang's Dither source. See [the implementation record](../development/shape-fill.md) for our substitutions and validation. The original Dither program was inspected, not compiled or executed during this review.

## Source observations

Line numbers refer to the pinned raw file.

| Lines / function | Observed behavior |
| --- | --- |
| 17–54, `dilate` | Loads Caslon “A”, draws with a 16-unit outline, extracts contours and simplifies them. |
| 80–123, `poisson_sample` | Sixteen candidates; 10% of sites weighted 2; count proportional to glyph area. |
| 126–235, `convexclip` | Approximates intersections by convex hull; marks boundary vertices, with an exemption for cells made entirely of boundary vertices. |
| 251–350, `walk`, `walk_all` | First eligible neighbor; asymmetric turn bounds; heavy sites start or terminate routes. |
| 372–412, `relax` | Three corner-relaxation passes; updates cell geometry and replaces sites by cell centroids. |
| 433–554 | Assigns endpoint buds and leaves attached to routed edges. |
| 557–642 | Solves natural cubic Bézier control points, then samples vines. |
| 648–710 | Leaves follow an edge-to-site-to-far-vertex construction, with veins. |
| 738–859, `make_petal`, `opt_flower` | Three-cubic petals; a forward semicircle of 32 cell rays; up to eight shuffled, shortened petals. |
| 874–975 | Unassigned cells receive fallen petals; renders buds, leaves, veins, outlined vines and flowers without motif clipping. |

## Dependency chain

The sketch imports `std/rand`, `std/geom`, `std/math`, `std/list`, `std/vec`, `std/io`, `std/drw`, `std/time`, `std/font` and `std/img`. It does not include another sketch. The local file `../dither-lang/examples/assets/caslon.ttf` is an additional input.

The corresponding [Dither language repository](https://github.com/LingDong-/dither-lang/tree/bc41eb0a2948fa5b6790639b65f07f9a50130883) was inspected at `bc41eb0a2948fa5b6790639b65f07f9a50130883`. This is a separately observed revision: the sketch does not pin its language dependency.

| Dependency | Inspected implementation and port implication |
| --- | --- |
| [`std/geom/static.js`](https://github.com/LingDong-/dither-lang/blob/bc41eb0a2948fa5b6790639b65f07f9a50130883/std/geom/static.js) | Voronoi cells come from circumcenters of a Bowyer–Watson triangulation; the implementation credits Paul Bourke's triangulation article. D3 is our substitute. Vertex order, unbounded-cell handling and floating-point behavior can differ. |
| [`std/rand/static.js`](https://github.com/LingDong-/dither-lang/blob/bc41eb0a2948fa5b6790639b65f07f9a50130883/std/rand/static.js) | Default seed `0x5EED`; xor shifts 17, 13 and 5. The sketch does not explicitly seed it. Our application's seed stream is a documented substitution. |
| [`std/font/header.dh`](https://github.com/LingDong-/dither-lang/blob/bc41eb0a2948fa5b6790639b65f07f9a50130883/std/font/header.dh), [`std/img/static.js`](https://github.com/LingDong-/dither-lang/blob/bc41eb0a2948fa5b6790639b65f07f9a50130883/std/img/static.js) | Font decoding supplies contours; image contour tracing credits Suzuki and Abe (1985). Our browser masks and contour extraction replace these facilities. |
| Drawing, math, lists, vectors, I/O, time | Language/runtime services are replaced by TypeScript, browser APIs and SVG. Dither's runtime and Caslon font are not shipped with this app. |

## Why the earlier flowers were cut

This is an implementation diagnosis, not an upstream claim. Our first engine scaled generic radial flowers against a cell's approximate radius, then clipped each motif to an inset polygon. The silhouette clip could cut it again. A large petal whose tip or control points crossed that polygon acquired a straight cut edge. Recoloring or adjusting the cell count could not repair that geometric construction.

The source instead couples flower pose to its vine attachment. Its petal origin lies between the attachment and the site; rays point into the cell's forward half, then their endpoints are shortened. This gives a coherent fan with room near its sides. The source's cubic controls can still exceed the ray endpoint or a concave mask: it is not a strict containment proof.

Our adaptation fits or omits an entire motif when it cannot fit, preserving its complete contour rather than using a clipping polygon to create the visible shape. Inspect all control points or sampled segments, not only petal tips. Preserve leaf attachment, bud endpoints and natural-cubic vine continuity when evaluating this change. Narrow letters necessarily offer smaller allocations than the broad typography examples.

## Attribution and terms observed

Author: Lingdong Huang. The reviewed `orntxt.dh` has no license header. The tracked `dither-sketches` tree contains no license file, and its README states no reuse terms. The reviewed Dither language root likewise has no project-wide license file; embedded dependency notices are not a license for the sketch. No explicit upstream license has been established by this review. These observations do not assert that no separate permission or terms exist. The repository's own MIT license does not relicense the upstream material; [third-party notices](../../THIRD_PARTY_NOTICES.md) preserve this distinction.

For visual comparison, the article's [dense floral specimen](https://dam-prod.media.mit.edu/thumb/2026/07/21/Screenshot%202026-06-23%20at%206.24.51PM.png.1400x1400.png) and [typography sheet](https://dam-prod.media.mit.edu/thumb/2026/07/21/Screenshot%202026-07-21%20at%203.13.54PM.png.1400x1400.png) show attached fan flowers, oval buds, leaves and outlined vines. Both are credited and copyrighted to Lingdong Huang by the article. They were inspected outside the repository and are not bundled assets. They are design references, not pixel-equivalence fixtures for this particular source revision.
