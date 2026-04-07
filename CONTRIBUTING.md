
# Contributing

## Adding alerting rule

If you don't have time to write a PR, just copy and paste some alerts into an issue. We will format it accordingly.

Rules are here: `_data/rules.yml`.

### Guidelines

Please ensure your pull request adheres to the following guidelines:

- Search previous suggestions before making a new one, as yours may be a duplicate.
- Keep descriptions short and simple, but descriptive.
- Description must be factual (the "what?") and should provide root cause suggestions (the "why?"), for faster resolution.
- Queries must be tested on latest exporter version.

## Improving the website

The site is built with Astro + TypeScript, located in `site/`.

### Run locally

```
cd site
npm install
npm run dev
```

Site serves at http://localhost:4321/awesome-prometheus-alerts.
