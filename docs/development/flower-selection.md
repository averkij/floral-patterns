# Page garden flower selection

Implemented 2026-11-07 in `florilegium-continuous-v3`, against unchanged Florilegium revision `9fbaf56d53e6525e02da05cd802ea7da82052099`.

## Source observations

The pinned `florilegium-species.lua` exposes `sample(seed, role, log, fix)` and `community(pool, rng)`. Its community contains four plants. Its rose, lily and daisy plans provide suitable foliage, but it does not define all eight requested named varieties. `florilegium-native.lua` calls exported `bloom` from its inflorescences, independently of their stalks. Its original flower tones share the ink/accent ramps.

## Our implementation

`src/flowers.ts` defines eight stable IDs and independent default colors. `src/engines/page-flowers.ts` adds original vector illustrations: layered roses, spotted six-petal tiger lilies, fringed bachelor's buttons, cupped tulips, seeded sunflowers, narrow-petal asters, blotched pansies and hanging snowdrops. These are stylized illustrations, not botanical reconstructions or upstream species presets.

A separate seeded shuffle selects up to four varieties from the allowed set. One to four selected varieties all enter the plant community; larger selections are a pool, not a guarantee that every variety appears. Selection order is canonical, independent of checkbox click order. The original community call retains its layout-stream consumption, and each replacement receives its original plant seed. Foliage comes from the closest upstream body plan, with solitary inflorescences. Spring buds and autumn fruit retain the upstream renderer; flower color applies to open blooms and pale background blooms, not those seasonal organs. Clipping and seasonal stages can hide flowers even when their plant is present.

Bloom detail uses a separate per-organ random stream. RGB changes only affect paint; geometry, timing, foliage and visitors remain identical for a fixed configuration. Hooks are scoped to one generation and restored after success or failure. The submodule and copied vendor sources are unchanged. Omitted flower settings in legacy engine calls retain the original community; the v3 adapter identifier distinguishes the new capability.

## Evidence

The Wasmoon integration suite generates all eight varieties, checks distinct geometry, recolors each without changing paths/events/statistics, checks restoration of runtime hooks, and repeats a mixed selection byte-for-byte. Invalid empty selections and malformed colors fail explicitly. Typecheck, all 29 tests and the production build passed at the engine checkpoint. Browser evidence is recorded with the controls checkpoint below.
