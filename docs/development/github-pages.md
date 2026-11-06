# GitHub Pages development direction

**Decision recorded 2026-11-06:** build browser demos in this repository and deploy them with GitHub Pages. This records the user's intended destination. Hosting settings and a deployment workflow have not been configured by this research task.

The repository remote is `https://github.com/averkij/floral-patterns.git`. Assuming the standard project-site configuration and no custom domain, plan for `https://averkij.github.io/floral-patterns/`; this is an expected future URL, not a verified live deployment.

## Constraints to preserve

GitHub Pages serves static HTML, CSS and JavaScript; generated static artifacts may be built in CI. Therefore runtime generation should execute in the browser, or use precomputed assets shipped in the site. Do not design the initial demos around a required application server or runtime secrets. [GitHub Pages overview](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages).

Our implementation requirements:

- Support the `/floral-patterns/` prefix. Asset, worker, WASM, font and module URLs must respect the configured base. Avoid accidental origin-root URLs such as `/worker.js`.
- Prefer individual static demo pages or hash-based state/navigation initially. Reloading a shared demo URL must not depend on server-side route rewriting.
- Keep generation code separate from UI. Preserve deterministic seeds and versioned settings; offer downloadable results and shareable links.
- Test the built output under a project subpath, not only a dev server at `/`.
- Maintain a small gallery index as demos arrive, with source credits and links to their research notes.

## Florilegium integration choice

For the first adapter, investigate the pinned [upstream worker](../../florilegium/web/worker.js) and [workflow](../../florilegium/.github/workflows/pages.yml). The artifact must include the Lua modules the worker loads, not just the web directory. Fonts and third-party notices also need to travel with any reused UI/assets.

Choose deliberately between retaining pinned external runtime downloads and bundling the runtime. Verify the resulting worker/WASM paths from the built site. A successful local Lua invocation is not sufficient evidence that the deployed browser worker loads.

## Deployment workflow to implement with the first demo

1. Enable GitHub Actions as the Pages publishing source when ready to publish.
2. Check out this repo and initialize the pinned submodule when the build uses it; do not silently track upstream `main`.
3. Install locked dependencies, run the relevant checks, and build a dedicated static output directory. Do not publish the whole research checkout accidentally.
4. Use GitHub's configure, artifact-upload and deploy actions. For separate jobs, make deployment depend on the build. Grant the deploy job `pages: write` and `id-token: write`, and use the `github-pages` environment.
5. Serialize deployments and verify the reported site URL, a demo reload, its worker/assets, and an export after publishing.

The sequence follows [GitHub's custom-workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), checked 2026-11-06. Select supported action versions when creating the workflow and pin them according to the repository's policy at that time.

Do not add a placeholder deployment workflow before there is a build artifact. The next concrete milestone is the specimen demo plus a reproducible build, followed by its Pages deployment.
