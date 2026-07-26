# CLAUDE.md — Website

The Astro + TypeScript static site that renders `../_data/rules.yml` into browsable,
copy-pasteable Prometheus alert pages and per-exporter downloadable rule files.

For the rule data model and authoring conventions (`_data/rules.yml`, PromQL/query validation,
review pitfalls), see the repository-root `../CLAUDE.md`. This file covers only the site.

## Architecture

- **`src/data/rules.ts`** — Typed wrappers and helper functions over `../_data/rules.yml`.
- **`src/data/site.ts`** — Shared site metadata constants (URLs, author, schema objects).
- **`src/pages/`** — Astro page routes: `index.astro` (homepage), `rules/[group]/[service].astro` (per-service rule pages), `alertmanager.astro`, `blackbox-exporter.astro`, `sleep-peacefully.astro` (guides).
- **`src/layouts/BaseLayout.astro`** — Root HTML layout (SEO, GA, dark mode).
- **`src/layouts/GuideLayout.astro`** — Layout for guide pages (TOC, hero, related guides).
- **`src/components/`** — Shared Astro components (Header, Footer, Sidebar, RuleCard, ExporterSection, etc.).
- **`astro.config.mjs`** — Astro configuration (sitemap, Vite YAML plugin, base URL).

## Running Locally

```bash
npm install
npm run dev
```

Site serves at http://localhost:4321/awesome-prometheus-alerts.

To build for production:

```bash
npm run build
npm run preview
```

Before committing site changes, run the linters:

```bash
npm run lint    # eslint
npm run check   # astro check (type-checks .astro/.ts)
```

These lint only the `site/` TypeScript/Astro code. `../_data/rules.yml` — the file most
contributions edit — has no linter or schema (its conventions live in the root `CLAUDE.md`),
so those are enforced only by review.
