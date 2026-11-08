# awesome-prometheus-alerts

Share your Prometheus alerting rules with [Awesome Prometheus Alerts](https://samber.github.io/awesome-prometheus-alerts/), the collection of 1,000+ production-ready alerting rules.

```sh
npx awesome-prometheus-alerts share /etc/prometheus/rules
```

The maintainer reviews shared rules to find patterns, thresholds and services the collection is missing.

## Usage

```sh
npx awesome-prometheus-alerts share [options] <file or directory...>
```

| Option | Description |
| --- | --- |
| `-y`, `--yes` | Skip the confirmation prompt (required in non-interactive shells such as CI). |
| `--dry-run` | Show what would be shared, without uploading anything. |
| `--hostname <name>` | Hostname to share under. Defaults to the machine's hostname. |
| `--server <url>` | Upload server. Defaults to `$APA_SHARE_URL`, then `https://share.awesome-prometheus-alerts.samber.dev`. |
| `-h`, `--help` | Show the help. |
| `-v`, `--version` | Show the version. |

Examples:

```sh
# Preview first
npx awesome-prometheus-alerts share --dry-run /etc/prometheus/rules

# Several files and directories at once
npx awesome-prometheus-alerts share alerts.yml k8s/prometheus-rules/ thanos/rules/
```

Requires Node.js 22 or later.

## What is sent

Only rule documents leave your machine:

- Directories are scanned recursively for `.yml` and `.yaml` files. Hidden directories and `node_modules` are skipped.
- A file is shared only if it is a Prometheus rule file (top-level `groups`) or a `PrometheusRule` resource.
- `prometheus.yml`, `alertmanager.yml` and any other YAML file are skipped, because they often contain passwords, tokens or webhook URLs.
- In multi-document files, non-rule documents (for example a Kubernetes `Secret`) are removed before upload.
- Files are sent with their path relative to the argument you passed (`rules/node.yml`), never their absolute path.
- The hostname (or `--hostname`) and the CLI version are sent with the files. Your IP address is used for rate limiting only and is not stored.

Rule files can still reveal internal names (hosts, jobs, teams, runbook URLs). Review the list printed before the confirmation prompt, or use `--dry-run`. Rules derived from shared files may be published in Awesome Prometheus Alerts under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

## Development

```sh
npm install
npm run check   # TypeScript
npm run lint    # ESLint
npm test        # Vitest
npm run build   # compiles to dist/

node dist/index.js share --server http://localhost:4242 --dry-run ../dist/rules
```

The upload server lives in [`../server`](../server). Run both locally with the repository's `docker-compose.yml`.

## License

MIT
