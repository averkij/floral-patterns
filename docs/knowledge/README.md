# Floral pattern knowledge base

Research reviewed on 2026-11-06. This is a working notebook for building browser demos, with source findings kept separate from our own proposals.

## Start here

| Source note | What it contributes | Review scope |
| --- | --- | --- |
| [Wong, Zongker and Salesin (1998)](wong-1998.md) | Adaptive ornament and growth into empty space | Paper text, algorithm, examples, selected rendered figures, complete bibliography |
| [Walter Crane, Line and Form](crane-line-and-form.md) | Rhythm, balance, motif families and boundary-aware composition | Selected passages in chapters II, IV, V and VI |
| [Florilegium](florilegium.md) | Existing generator and browser integration | Pinned local source, documentation, worker and Pages workflow; not executed in this review |
| [Lingdong Huang's MIT project](huang-voronoi.md) | Partition-first floral composition | Full project overview |
| [ornalt.dh](ornalt-code.md) | Concrete Dither implementation | Source inspection of geometry, routing, assignment and rendering pipeline; not executed |
| [Reference trail](references.md) | All 36 references from Wong et al. plus selected follow-ups | Individual review levels recorded below |

For implementation planning, see [demo experiments](../development/experiments.md) and [GitHub Pages direction](../development/github-pages.md).

## Working interpretation

Our central experiment is how to make a composition respond convincingly to its container. Compare growth into remaining space with a layout that allocates space before drawing. Keep motif design, composition and rendering independently inspectable so that a beautiful flower does not hide a weak arrangement.

Proposed quality dimensions: readable large-scale movement, distinct motif sizes, deliberate empty space, convincing attachments, boundary fit, and reproducibility. These are project evaluation choices, not a claim that the sources provide one universal aesthetic score.

## Maintaining these notes

- Add direct links and section, figure or function locators for factual claims.
- Pin code references to commits and record the review date.
- Label source observations, implementation inferences and untested proposals explicitly.
- A bibliography entry is not evidence that we have read the original work. Preserve review status when adding summaries.
- Keep third-party papers and scans out of this repository by default; link to the originals. Record attribution and applicable upstream terms when adapting code or distributing assets.
- Update the experiments after demos produce evidence, and commit at meaningful checkpoints.
