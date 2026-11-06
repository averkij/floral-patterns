# Repository guidelines

This repository is for experimenting with floral pattern generation.

Make commits at meaningful checkpoints, with each commit capturing a coherent, verified step of the work.

## Research and development

- Read [the knowledge base](docs/knowledge/README.md) before implementing a new generation method. Keep source-backed findings separate from our hypotheses, record references and code revisions, and update the notes when experiments produce evidence.
- Build interactive browser demos for **GitHub Pages**. Follow [the deployment direction](docs/development/github-pages.md) and consult [the experiment backlog](docs/development/experiments.md).
- Keep demos compatible with static hosting and the `/floral-patterns/` project subpath, including asset, worker and WASM URLs. Prefer browser-side generation or precomputed assets.
- Make experiments reproducible with explicit seeds and versioned settings. Plan for shareable configurations and downloadable outputs.
- Keep our experiments outside the `florilegium/` submodule. Change its pinned revision deliberately, and retain applicable upstream attribution and license notices when reusing code or assets.
- Verify the relevant behavior before each checkpoint commit; for deployed demos, include a smoke check of built output under the project subpath. Record limitations without presenting planned features as implemented.
