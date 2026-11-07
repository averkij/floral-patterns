# Floralia / Floral patterns

A browser laboratory for procedural floral ornament, built with React, TypeScript and Vite. Two interactive experiments explore how plants can respond to a page or a silhouette.

## The experiments

Page garden now offers **roses, tiger lily, bachelor's button, tulip, sunflower, aster, pansy and snowdrop**, with a separate default and editable color for each. Select one or several; the seed chooses up to four varieties for a garden. Flower colors are independent of foliage ink, survive shared links and export, and can be reset together. Press **Grow pattern** to apply edits. See [flower selection and seasonal limits](docs/development/flower-selection.md).

**Page garden** runs the actual [Florilegium](https://github.com/kevinraymond/florilegium) Lua engine in a browser worker through Wasmoon. Move or resize the reserved rectangle on a 210 × 297 mm A4 sheet; choose colors, density, season, and permitted butterflies, bees, birds and snails. Our adapter supplies one continuous A4 growth field around the excluded rectangle, retaining the native coordinate system and a common lower-left origin. The seed determines which visitors arrive. **Watch growth** plays one compact event timeline; **Replay same seed** repeats the composition. See [the method and limitations](docs/development/florilegium-frame.md).

**Shape & letter** fills a circle, arch, heart, freehand region or large lettering with flowers, leaves and routed vines. Choose serif or sans lettering, density, flower scale, colors, and a cell overlay. The generator adapts [Lingdong Huang's `orntxt.dh` typography demo](https://github.com/LingDong-/dither-sketches/blob/8e7a1cbf91fa9736179eba0953e79dc49867f74a/orntxt.dh): weighted samples, cell-edge routes, natural cubic vines, attached leaves, buds and fan flowers. It fits complete motifs rather than cutting their outlines with cell clips. This is a browser port with documented substitutions, not pixel-identical Dither execution or certified geometric non-overlap. See [the source review](docs/knowledge/orntxt-code.md) and [implementation notes](docs/development/shape-fill.md).

Both demos have explicit seeds, versioned settings, shareable hash links and SVG downloads. SVG exports include the paper color and omit editing guides. Lettering is converted to contours so exported artwork does not require the original font. These are two initial methods to study and evolve, with further comparison work recorded in [the experiment backlog](docs/development/experiments.md).

The initial canvas and every edit are drafts. Press **Grow pattern** to apply the current seed and settings, including a moved/resized rectangle or a completed freehand region. The button shows activity during computation and growth playback. Preview controls offer **Fit** or **25–200%** zoom with scrolling for larger artwork; zoom changes the view, while exported artwork keeps its original dimensions.

The page experiment also downloads its growth animation as **MP4**, with **WebM** fallback when the browser cannot encode H.264. Video includes the chosen paper, flowers, visitors and styled text at 764 × 1080, 30 fps. It renders entirely in the browser with progress and cancellation; live playback can be off. See [video export and browser limitations](docs/development/video-export.md).

## Run locally

Use Node 24 and npm. Initialize the pinned reference implementation when cloning:

```sh
git clone --recurse-submodules https://github.com/averkij/floral-patterns.git
cd floral-patterns
npm ci
npm run dev
```

For an existing clone, first run `git submodule update --init --recursive`. Open `http://127.0.0.1:5173/floral-patterns/` after starting the development server.

Check and preview the production build:

```sh
npm run typecheck
npm test
npm run build
npm run preview
```

The preview is at `http://127.0.0.1:4173/floral-patterns/`. Tests cover the real Lua adapter, deterministic shape generation, mask handling and worker lifecycle. Verify both demos, shared-state reloads, downloads and responsive layout in this built preview before a checkpoint.

The `predev` and `prebuild` hooks copy Lua sources, WASM, fonts and license notices into `public/` from the pinned submodule and locked dependencies. Generated copies are ignored by Git. The app serves these assets locally and requires no application server or runtime CDN.

## GitHub Pages

Vite is configured for the `/floral-patterns/` project path. The [Pages workflow](.github/workflows/pages.yml) initializes submodules, installs the lockfile, checks types, runs tests and builds `dist`. Pull requests run the checks. Pushes to `main`, or manual runs on `main`, also publish through the `github-pages` environment.

Set the repository's **Settings → Pages → Source** to **GitHub Actions**, then push the verified checkpoint. The expected project URL is `https://averkij.github.io/floral-patterns/`; a live deployment has not been verified. Follow [the deployment notes](docs/development/github-pages.md) for the first publication and subpath smoke check.

## Research and attribution

- [Knowledge base](docs/knowledge/README.md): reviewed sources, insights and references.
- [Demo experiments](docs/development/experiments.md): implementation status and open research questions.
- [Third-party notices](THIRD_PARTY_NOTICES.md): source, runtime and font attribution.
- [Repository guidelines](AGENTS.md): working conventions and checkpoint commits.

Florilegium lives in `florilegium/` at a pinned revision. Keep experiments outside it and change its revision deliberately. Upstream code and assets retain their applicable licenses, including the LPPL exception for `florilegium-pgfmath.lua`.

Make commits at meaningful checkpoints, including research milestones and verified demo changes.
