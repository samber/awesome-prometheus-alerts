# CLAUDE.md — Share CLI

The `awesome-prometheus-alerts` npm package. `npx awesome-prometheus-alerts share <paths...>`
uploads Prometheus rule files to the share server (`../server`). User-facing docs: `README.md`.

## Architecture

- `src/index.ts` — bin entry point (shebang), sets the exit code.
- `src/cli.ts` — argument parsing (`node:util` `parseArgs`), usage text, real I/O wiring.
- `src/share.ts` — the `share` command: collect, classify, summarize, confirm, upload, thank.
  Takes an injected `Io` (output, confirmation prompt, `fetch`) so tests never touch a TTY or the network.
- `src/collect.ts` — expands arguments into YAML files and computes upload paths.
- `src/classify.ts` — decides whether a YAML file is a rule file, and strips non-rule documents.
- `src/upload.ts` — HTTP client for `POST /v1/shares`, endpoint resolution.
- `src/constants.ts` — default server URL, social links, size limits.

## Invariants

- Only rule documents leave the machine. `classify` is the security boundary: files whose documents
  are not `groups`-based rule files or `PrometheusRule` resources are skipped, and non-rule documents in
  multi-document files are removed. Never relax this without an equivalent server-side check.
- Upload paths are relative to the argument (`<arg basename>/<relative path>`), never absolute, so home
  directory layouts and usernames are not sent.
- Plain `http://` is refused except for localhost, so rule files never travel unencrypted.
- `MAX_FILES`, `MAX_FILE_BYTES` and `MAX_TOTAL_BYTES` mirror the server defaults in
  `../server/internal/config/config.go`. Change both sides together.
- The only runtime dependency is `yaml`. Keep it that way: `npx` downloads the dependency tree on every
  cold run.

## Commands

```sh
npm install
npm run check && npm run lint && npm test && npm run build
```

TypeScript is pinned to 6.x because typescript-eslint does not support 7.x yet.

## Release

Bump `version` in `package.json`, merge, then push a `cli-v<version>` tag. The
`.github/workflows/cli-publish.yml` workflow publishes with npm trusted publishing (no token).
