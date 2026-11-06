# Lingdong Huang: non-overlapping floral patterns

[MIT Media Lab project overview](https://www.media.mit.edu/projects/non-overlapping-floral-patterns/overview/), titled *Filling Arbitrary Shapes with Non-Overlapping Procedural Floral Patterns*. Reviewed 2026-11-06. The overview links to the [presets source](https://github.com/LingDong-/dither-sketches/blob/main/ornalt.dh); see the separate [code review](ornalt-code.md).

## Source findings

The layout starts with relatively even, best-candidate samples and their Voronoi cells. Motifs occupy cells; vines follow cell boundaries instead of passing through motif centers. A second Voronoi construction and relaxation redistribute corners before routing a spanning forest. Turn preferences and spline interpolation shape the vines.

Flower assignment favors large cells with suitable endpoint directions. Leaves use a neighboring vine edge and a distant cell vertex. Heavier initial samples reserve larger regions, and modified relaxation preserves size contrast. Unassigned cells can become fallen petals.

Clipping is explicitly approximate: intersections and contained vertices are replaced by their convex hull. Clipping precedes relaxation, with boundary points fixed. The article discusses multiple spline choices and applies the method to decorated typography.

## Our implementation implications

This is a promising alternative for a dense letter or silhouette demo. Keep it as a separate generator so we can compare it with growth-based composition using identical input masks and palettes.

A convex hull can bridge a concavity or hole. Smooth splines and thick strokes can also leave their allocated space. Therefore, a future strict-containment mode needs robust polygon clipping, stroke-aware clearance and checks on the final geometry. A final SVG clip can hide escaped marks but cannot repair their topology or spacing.

Suggested stress cases: a crescent, a narrow neck, a letter with a counter, disconnected islands, and cells smaller than the stroke width. These are our proposed tests, not reported failures from the project.
