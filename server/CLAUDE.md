# CLAUDE.md — Share server

Go HTTP server receiving rule files from the share CLI (`../cli`) and storing them in S3.
Bucket layout, manifest format, API and configuration: `README.md`.

## Architecture

- `cmd/share-server/main.go` — wires the samber/do injector, runs the server, graceful shutdown.
- `internal/config` — environment variables → `*config.Config`.
- `internal/logging` — `*slog.Logger` (text in dev, JSON in prod).
- `internal/rules` — structural rule-file validation. Expressions are deliberately not parsed (see Invariants).
- `internal/share` — the use case: sanitize paths/hostname, validate, store files then `manifest.json`.
- `internal/storage` — `S3Store` on minio-go v7, works with AWS S3 and S3-compatible services.
- `internal/api` — chi router, handlers, rate limiting, `*api.Server`.

Every package has a `package.go` exposing a `do.Package` for dependency injection.
Interfaces (`share.ObjectStore`, `share.RuleValidator`, `api.Sharer`) are declared by their consumer.

## Domain jargon

- **Share** / **upload** — one `POST /v1/shares` call; stored under one `<date>/<hostname>/<time>Z/` folder.
- **Upload ID** — that folder path, also `manifest.id`, printed by the CLI as the reference.
- **Rule document** — a YAML document that is a Prometheus rule file (`groups`) or a `PrometheusRule` resource.
- **Issue** — a non-fatal structural problem (missing expr, unnamed group) recorded in the manifest; the file is kept.
- **Rejection** — a file that is not stored, with its reason.

## Invariants

- `manifest.json` is written after every file of the upload: downstream processing relies on it as the
  commit marker. Keep that order.
- Hostnames and paths are untrusted client input. `sanitizeHostname` and `sanitizePath` must never let a
  `/`, `..` or absolute path reach an S3 key; extend their tests when touching them.
- Every document of a stored file must be a rule document. This is the server-side half of the
  "no credentials in the bucket" guarantee; the CLI strips non-rule documents before upload.
- Client IPs are personal data: use them for rate limiting only, never log or store them.
- `X-Forwarded-For` is trusted only from `TRUSTED_PROXY_CIDRS` (chi `ClientIPFromXFF`). Never switch to
  `middleware.RealIP` or `httprate.LimitByRealIP`: both trust spoofable headers.
- Size limits mirror the CLI constants in `../cli/src/constants.ts`. Change both sides together.
- No PromQL parsing at ingest: it would flag LogQL/MetricsQL rules that are worth collecting. PromQL is
  checked during asynchronous review with `promtool`.
- Keep the dependency tree small. Do not add the AWS SDK (one module per service, many Dependabot PRs)
  or `github.com/prometheus/prometheus` (pulls the whole Prometheus server dependency graph).

## Commands

```sh
go test -race ./...
golangci-lint run ./...   # config in .golangci.yml, needs a golangci-lint built with Go >= 1.26
go build ./cmd/share-server
```

`github.com/minio/minio-go/v7` sets the minimum Go version in `go.mod`.
