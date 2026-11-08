# Share server

Receives Prometheus rule files sent by `npx awesome-prometheus-alerts share` (see [`../cli`](../cli)), validates them and stores them in an S3-compatible bucket for asynchronous review.

## Bucket layout

```
<YYYY-MM-DD>/<hostname>/<HHMMSS.mmm>Z/
├── <relative path of each shared file>.yml
└── manifest.json
```

- Dates and times are UTC.
- `<hostname>` is the client hostname, lowercased and reduced to `[a-z0-9.-]`.
- The time folder keeps several uploads from the same host on the same day apart.
- `manifest.json` is written **last**. A folder without it is an interrupted upload: skip it when processing.

`manifest.json` example:

```json
{
  "schema_version": 1,
  "id": "2026-11-08/prom-01.example.com/143012.457Z",
  "received_at": "2026-11-08T14:30:12.457Z",
  "hostname": "prom-01.example.com",
  "client": { "name": "awesome-prometheus-alerts", "version": "0.1.0" },
  "files": [
    {
      "path": "rules/node.yml",
      "size": 2048,
      "sha256": "…",
      "documents": 1,
      "formats": ["prometheus"],
      "groups": 2,
      "alerting_rules": 14,
      "recording_rules": 3,
      "issues": [
        { "document": 1, "group": "loki", "rule": "LokiErrors", "message": "invalid PromQL: …" }
      ]
    }
  ],
  "rejected": [
    { "path": "prometheus.yml", "reason": "not a rule file: document 1: no groups key" }
  ]
}
```

Use `sha256` to deduplicate files shared by several hosts.

## Validation

- A file is stored only if **every** YAML document in it is a Prometheus rule file (`groups`) or a `PrometheusRule` resource, with at least one alerting or recording rule. Anything else is rejected, which keeps credentials from other configuration files out of the bucket.
- PromQL is parsed with the Prometheus parser (experimental features enabled). Errors are recorded as `issues` instead of rejecting the file, so Loki, VictoriaMetrics and templated rules are still collected.
- Paths are sanitized (no absolute paths, no `..`, `.yml`/`.yaml` only, 12 levels and 256 characters at most).
- If no file is valid, nothing is stored and the API answers `422` with the rejection reasons.

## API

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/v1/shares` | JSON `{"hostname", "client": {"name", "version"}, "files": [{"path", "content"}]}`. Returns `201` and the manifest. Errors: `400`, `413`, `415`, `422`, `429`, `500`, with `{"error", "rejected"?}`. |
| `GET` | `/healthz` | Liveness probe. |
| `GET` | `/` | Short usage text. |

`POST /v1/shares` is rate limited per client IP. Client IPs are kept in memory for rate limiting only: they are neither logged nor stored.

## Configuration

Environment variables (see [`.env.dist`](.env.dist)):

| Variable | Default | Description |
| --- | --- | --- |
| `ENV` | `prod` | `dev` (text logs) or `prod` (JSON logs). |
| `LISTEN_ADDR` | `:4242` | HTTP listen address. |
| `LOG_LEVEL` | `info` | `debug`, `info`, `warn` or `error`. |
| `TRUSTED_PROXY_CIDRS` | (empty) | Comma-separated CIDRs of reverse proxies allowed to set `X-Forwarded-For`. Empty means the TCP peer is the client. |
| `RATE_LIMIT_REQUESTS` | `10` | Uploads allowed per client IP and window. |
| `RATE_LIMIT_WINDOW` | `1h` | Rate limit window (Go duration). |
| `MAX_FILES` | `500` | Files per upload. |
| `MAX_FILE_BYTES` | `1048576` | Size of a single file. |
| `MAX_BODY_BYTES` | `16777216` | Size of the request body. |
| `S3_BUCKET` | (required) | Destination bucket. It must already exist. |
| `S3_REGION` | `us-east-1` | Bucket region. |
| `S3_ENDPOINT` | (empty) | Endpoint of an S3-compatible service (MinIO, R2, Scaleway…). Empty for AWS. |
| `S3_FORCE_PATH_STYLE` | `false` | Path-style addressing, required by MinIO. |
| `S3_PREFIX` | (empty) | Optional key prefix in front of the date folders. |

Credentials come from the standard AWS chain: `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`, a profile or an IAM role. The server only needs `s3:PutObject` on the bucket, plus `s3:ListBucket` for the startup reachability check (`HeadBucket`).

## Running

Locally, with MinIO and hot reload, from the repository root:

```sh
cp server/.env.dist server/.env
docker compose up
```

Production image:

```sh
docker build -t awesome-prometheus-alerts-share-server server/
docker run -p 4242:4242 -e S3_BUCKET=… -e AWS_ACCESS_KEY_ID=… -e AWS_SECRET_ACCESS_KEY=… awesome-prometheus-alerts-share-server
```

The server waits up to 30 seconds for the bucket at startup, then exits if it is still unreachable. On `SIGTERM`, it stops accepting connections and lets in-flight uploads finish for up to 25 seconds.

## Development

```sh
go test -race ./...
golangci-lint run ./...
```
