# GitHub Pages development direction

**Decision recorded 2026-11-06:** build browser demos in this repository and deploy them with GitHub Pages. The React/Vite application and a build/deployment workflow now exist. Repository hosting settings and the remote deployment have not been verified by the local implementation task.

The repository remote is `https://github.com/averkij/floral-patterns.git`. Assuming the standard project-site configuration and no custom domain, plan for `https://averkij.github.io/floral-patterns/`; this is an expected future URL, not a verified live deployment.

## Constraints to preserve

GitHub Pages serves static HTML, CSS and JavaScript; generated static artifacts may be built in CI. Therefore runtime generation should execute in the browser, or use precomputed assets shipped in the site. Do not design the initial demos around a required application server or runtime secrets. [GitHub Pages overview](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages).

Our implementation requirements:

- Support the `/floral-patterns/` prefix. Asset, worker, WASM, font and module URLs must respect the configured base. Avoid accidental origin-root URLs such as `/worker.js`.
- Prefer individual static demo pages or hash-based state/navigation initially. Reloading a shared demo URL must not depend on server-side route rewriting.
- Keep generation code separate from UI. Preserve deterministic seeds and versioned settings; offer downloadable results and shareable links.
- Test the built output under a project subpath, not only a dev server at `/`.
- Maintain a small gallery index as demos arrive, with source credits and links to their research notes.

## Local build and assets

Initialize the submodule with `git submodule update --init --recursive`, install the lockfile with `npm ci`, then use `npm run dev`. Use Node 24 or a version supported by the locked Vite release. Run `npm run typecheck`, `npm test`, and `npm run build` before a checkpoint. `npm run preview` serves the built site; inspect `http://127.0.0.1:4173/floral-patterns/`, including both demos, downloads and a shared-state reload. Confirm that initial load and edits remain drafts until Grow pattern, the busy state covers computation/playback, and Fit/zoom leave SVG export dimensions unchanged.

Vite uses the explicit `/floral-patterns/` base. The `predev` and `prebuild` hooks run `scripts/prepare-assets.mjs`, which copies the pinned Lua modules, local Wasmoon WebAssembly, fonts and license notices. These generated public files are ignored by Git. The script has no network dependency: sources come from the submodule and installed lockfile. The generated `THIRD_PARTY_NOTICES.md` records the exact runtime package versions and links to their licenses. Keep the root notices' Florilegium revision aligned with deliberate submodule updates.

## Florilegium integration choice

The adapter follows the pinned [upstream worker](../../florilegium/web/worker.js). See [the frame experiment](florilegium-frame.md) for the adapter's settings and limitations. The artifact includes the Lua modules under `vendor/florilegium/`; the unmodified `florilegium-pgfmath.lua` keeps its LPPL notice and is accompanied by the complete license. Fonts and third-party notices travel with the published site.

Wasmoon's JavaScript interface is bundled into the worker; its WASM file is copied to `vendor/wasmoon/glue.wasm`. Both are served from the built project, with no runtime CDN dependency. Verify the worker/WASM paths from the built site. A successful local Lua invocation is not sufficient evidence that the deployed browser worker loads.

## Deployment workflow

1. Enable GitHub Actions as the Pages publishing source when ready to publish.
2. Check out this repo and initialize the pinned submodule when the build uses it; do not silently track upstream `main`.
3. Install locked dependencies, run the relevant checks, and build a dedicated static output directory. Do not publish the whole research checkout accidentally.
4. Use GitHub's configure, artifact-upload and deploy actions. For separate jobs, make deployment depend on the build. Grant the deploy job `pages: write` and `id-token: write`, and use the `github-pages` environment.
5. Serialize deployments and verify the reported site URL, a demo reload, its worker/assets, and an export after publishing.

The implemented [workflow](../../.github/workflows/pages.yml) checks types, runs tests and builds on pull requests. Main-branch pushes and manual main-branch runs also upload `dist` and deploy through the `github-pages` environment. It initializes the pinned submodule, installs with `npm ci`, uses Node 24 and serializes deployment runs. Enable GitHub Actions as the repository's Pages source before the first publication.

The sequence follows [GitHub's custom-workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) and [Vite's Pages deployment guide](https://vite.dev/guide/static-deploy), checked 2026-11-06. Actions are pinned to full commit SHAs: [checkout 7.0.1](https://github.com/actions/checkout/releases/tag/v7.0.1), [setup-node 7.1.0](https://github.com/actions/setup-node/releases/tag/v7.1.0), [configure-pages 6.0.0](https://github.com/actions/configure-pages/releases/tag/v6.0.0), [upload-pages-artifact 5.0.0](https://github.com/actions/upload-pages-artifact/releases/tag/v5.0.0), and [deploy-pages 5.0.1](https://github.com/actions/deploy-pages/releases/tag/v5.0.1).

The workflow is ready for a push, but this document does not claim a live deployment. Verify the final URL and a generation/export smoke check after the first successful remote run.
