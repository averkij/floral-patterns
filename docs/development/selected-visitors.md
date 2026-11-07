# Selected visitors in the growth field

Implemented 2026-11-07 in `florilegium-continuous-v5`, replacing the v4 overlay introduced in `e366616`. The upstream pin remains `9fbaf56d53e6525e02da05cd802ea7da82052099`; vendor sources and the submodule are unchanged.

## Source observations

The pinned grower uses one shared free-space field, not a separate animal-only field:

- `florilegium-grow.lua:281–328`: `field`, `free_at` and `disc` query available space and claim it for subsequent growth. Proxy discs intentionally allow some overlap.
- `florilegium-grow.lua:497–520`: visitor genomes supply natural illustrated sizes and per-group room estimates.
- `florilegium-grow.lua:554–610`: independent random streams decide which visitors are eligible. Snail/bird probabilities are 0.4/0.22, and density below 0.3 disables several types. Enabling a type therefore never guaranteed its appearance.
- `florilegium-grow.lua:1099–1187`: snails search main stems for room; birds search for a perch, grow a supporting twig, then reserve body/tail space. Events are children of the supporting stem or twig.
- `florilegium-grow.lua:1400–1483`: flying visitors compete for free holes alongside plant motifs, then claim a proxy for later growth.
- `florilegium-native.lua:4530–4554`: perched birds have feet at the local origin; a hovering pose has different anatomy. `florilegium-ink.lua:284` measures conservative drawing bounds in page points.

These observations come from the pinned local source, not a claim of strict geometric non-overlap in upstream output.

## What was wrong with v4

Our guarantee fix suppressed probabilistic visitor paint but retained its layout consumption, then appended each required visitor over the completed plants. Fixed rectangles in the four page bands kept visitors inside the page and outside the text reservation, but ignored foliage occupancy. Their animation used a fixed late-page time. This guaranteed presence at the cost of natural placement, scale and attachment; the default seed-42 screenshot visibly put the butterfly and snail over leaves and stems. The previous requirement that visitor toggles preserve every plant path prevented the plants from making room for animals.

## v5 implementation

`src/engines/page-visitors.ts` now measures each selected native illustration at the upstream genome-derived size. A checked runtime hook in `page-lua.ts` invokes required placement at the upstream stem-visitor stage, before the main leaf and hole-filling passes. Probabilistic visitors are disabled, so there are no invisible visitor claims or duplicate illustrations.

Flying visitors choose existing free discs near plants. A perched bird receives a rising twig that ends under its feet; in tight borders it can instead use a measured footprint on an existing stem. Snails fit their measured footprint along a main-stem tangent, allowing foot contact while checking the shell and feelers against the field. Candidates are checked against the page/text domain. If necessary, a visitor shrinks until it fits. Every placed visitor reserves a padded disc in the **same field** used by later leaves, branches, flowers and fillers.

Visitors are painted in the native accent layer and recorded through the native event scheduler, with timing tied to the supporting stem/twig. There is no appended animal SVG or synthetic end-of-page event. The browser still uses compact reveal/scale playback; upstream's full flight and crawl trajectories are not implemented by this compact player.

Selection is canonical and deterministic, with seeds independent of paint colors. Exactly one illustration is placed per selected type. Visitor selection now deliberately changes the surrounding foliage so it can respect occupied space; v4 and v5 do not reproduce identical plant geometry. Recoloring remains paint-only. Linked bloom colors (`Под цвет зелени`) retain their existing behavior.

## Verification and limitations

Typecheck/build and all 40 tests passed. Wasmoon integration tests cover all four UI types together, each alone, none selected, reverse selection order, repeatability, low/full density, all seasons, and maximal/offset text reservations. They verify claimed free-space clearance for unattached visitors, native event timing, plant generation around selections, and a recognizable bird width even in the maximal reservation fixture. Ordinary upstream versus compact rendering is still compared with visitors disabled; flower recoloring and hook restoration remain covered.

Production-subpath Edge checks (Playwright; Browser plugin unavailable) generated and exported seeds 42, 7, 1, 2147483646 and 19 at densities 20–100%, including the 18 mm border and two offset reservations. All four selected types appeared in each output. At 840 × 1188 raster resolution, separate visitor/plant alpha masks had zero painted intersection for butterflies and bees in these five fixtures. Bird overlap was about 0.6–6.7% and snail overlap 3.7–16.1%, including intentional twig/foot contact; these are sample observations, not universal collision bounds. Desktop screenshots were reviewed at 1440 × 1000 and a 390-pixel mobile check passed. Completed animation exported the identical SVG as static generation. No page/console errors or failed asset requests occurred.

The field still uses approximate proxies. Later curves and leaves can overlap slightly, and attachment deliberately permits contact. Extremely narrow borders scale visitors down (the tested maximal reservation gives a roughly 6 mm bird). Exact collision-free silhouettes, other browser engines and full flight/crawl playback remain unverified or unimplemented.
