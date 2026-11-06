# Floral patterns

A laboratory for procedural floral ornament: flowers, leaves, vines, borders, decorated letters and repeating patterns.

We will build interactive browser demos and publish them with **GitHub Pages**. The repository currently contains research notes and the Florilegium submodule; no demo or deployment has been implemented yet.

- [Knowledge base](docs/knowledge/README.md): reviewed sources, insights and references.
- [Demo experiments](docs/development/experiments.md): proposed sequence and evaluation criteria.
- [GitHub Pages direction](docs/development/github-pages.md): constraints for future development.
- [Repository guidelines](AGENTS.md): persistent working conventions.

## Getting the reference implementation

```sh
git clone --recurse-submodules https://github.com/averkij/floral-patterns.git
```

For an existing clone:

```sh
git submodule update --init --recursive
```

[Florilegium](https://github.com/kevinraymond/florilegium) lives in `florilegium/` at a pinned revision. Keep our experiments outside it unless intentionally preparing an upstream change. Its code and assets retain their upstream licenses.

Make commits at meaningful checkpoints, including research milestones and verified demo changes.
