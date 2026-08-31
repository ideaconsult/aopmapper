# Repository Guidance

## Scope and Security

- Treat this project as an MVP: prefer the smallest complete change and defer non-essential polish. Security is the exception; never defer protection where users could be put at risk.
- Treat URL state and all Solr responses as untrusted. Free-text `q` intentionally accepts raw Solr syntax, but structured controls such as IDs, graph modes, types, filters, and sort fields must remain validated or allowlisted before query composition.
- Preserve React's escaped rendering and strict outbound-link construction. When touching CSV export, account for spreadsheet-formula injection from Solr values.
- `scripts/build-help.mjs` passes Markdown through unsanitized `marked`; do not allow user-controlled Markdown into that pipeline without adding sanitization.

## Toolchain and Validation

- Use `pnpm`; Node `24.14.1` matches the Docker build. Docker/CI validates with `CI=true pnpm install && pnpm build`.
- Run `pnpm dev` for local development. It regenerates help pages before starting Vite on port 3000; use the URL Vite prints because there is no configured `/aop/` basename.
- Run `pnpm build` for required local validation. It runs `prebuild`, regenerates help pages, and writes the site to `dist/`.
- No test, focused-test, lint, formatter, or typecheck command is configured. Do not invent one; add targeted manual checks, noting that functional search checks require network access to the live Solr service and CDN assets.

## Generated Documentation

- Edit `guide.md` and `mcp.md`, not `public/help.html` or `public/mcp.html`; regenerate tracked HTML with `pnpm run build-help` and review the generated diff.
- Help generation runs once when `pnpm dev` starts and is not watched. Rerun it after Markdown edits made while Vite is running.
- The generator strips front matter but does not interpolate variables in the Markdown body; do not rely on front-matter placeholders.

## Architecture and Contracts

- This is one React/Vite browser SPA. `src/main.jsx` mounts `src/App.jsx`; `src/hooks/useAopSearch.js` owns URL/search state and request caches; `src/utils/solr.js` builds queries and talks directly to the hard-coded public Solr endpoint.
- The Solr indexing pipeline and MCP server documented in `guide.md` and `mcp.md` are external systems, not implementations in this repository.
- Search URLs are a public compatibility contract and auto-execute when opened. Add persisted form state to both `stateFromParams` and `stateToParams` in `src/hooks/useAopSearch.js`.
- Search-schema changes are cross-cutting. Coordinate the Solr `FL` list and filter allowlist, `SearchForm`, `TYPE_LABELS`, `NetworkGraph` groups, badge CSS in `src/index.css`, examples, and `guide.md` as applicable.
- Preserve Vite's relative `base: './'`; use relative paths or `import.meta.env.BASE_URL` rather than root-absolute application asset URLs.

## Dependencies and Git

- Docker/CI installs from `pnpm-lock.yaml`, but both `pnpm-lock.yaml` and `package-lock.json` are tracked. Dependency changes must regenerate and review both lockfiles.
- Follow `CONTRIBUTING.md`: work on feature branches, use pull requests, rebase regularly, and avoid merge commits when pulling.
