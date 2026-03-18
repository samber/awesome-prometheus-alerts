# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A curated collection of ~940 Prometheus alerting rules covering 90+ services across 100+ exporters, organized in 7 categories: basic resource monitoring (Prometheus, host/hardware, SMART, Docker, Blackbox, Windows, VMware, Netdata), databases and brokers (MySQL, PostgreSQL, Redis, MongoDB, RabbitMQ, Elasticsearch, Cassandra, Clickhouse, Kafka, etc.), reverse proxies and load balancers (Nginx, Apache, HaProxy, Traefik, Caddy), runtimes (PHP-FPM, JVM, Sidekiq), orchestrators (Kubernetes, Nomad, Consul, Etcd, Istio, ArgoCD, FluxCD), network/security/storage (Ceph, ZFS, Minio, SSL/TLS, CoreDNS, Vault, Cloudflare), and observability tools (Thanos, Loki, Cortex, OpenTelemetry Collector, Jenkins).

All rules are stored in a single YAML data file (`_data/rules.yml`) and rendered as a Jekyll-based GitHub Pages site at https://samber.github.io/awesome-prometheus-alerts. The site provides copy-pasteable Prometheus alert snippets and downloadable rule files per exporter.

The project is community-driven. Most contributions are PRs adding or updating rules in `_data/rules.yml`. Files in `dist/rules/` are auto-generated on merge — never edit them manually.

## Architecture

- **`_data/rules.yml`** — The single source of truth for all alerting rules. This is the main file contributors edit. It is NOT a valid Prometheus config; the site renders each rule into copy-pasteable Prometheus alert format.
- **`rules.md`** — Jekyll template that iterates over `_data/rules.yml` and renders the rules page with copy buttons and formatted YAML blocks.
- **`alertmanager.md`** — Static page with Prometheus/AlertManager configuration examples.
- **`_layouts/default.html`** — Site layout (Jekyll theme: cayman).
- **`_config.yml`** — Jekyll configuration.
- **`dist/rules/`** — Pre-built downloadable rule files organized by service/exporter (referenced in the site for `wget` commands).

## Rules YAML Structure

Services are listed in README.md.

`_data/rules.yml` hierarchy:
```
groups:
  - name: "<category>"        # e.g. "Basic resource monitoring"
    services:
      - name: "<service>"     # e.g. "Host and hardware"
        exporters:
          - name: "<exporter>"
            slug: "<slug>"          # used for download URLs
            doc_url: "<url>"        # optional link to exporter docs
            comments:               # optional, exporter-level multiline notes rendered before rules
              "<comment>"
            rules:
              - name: "<alert name>"
                description: "<text>"
                query: "<PromQL>"
                severity: warning|critical|info
                for: "<duration>"   # optional, defaults to 0m
                comments:           # optional, rendered as multiline YAML comments
                  "<comment>"
```

Services are grouped in category. If you are not sure about the classification, ask the developer.

## Running Locally

```bash
# With Ruby/Bundler
gem install bundler
bundle install
jekyll serve

# With Docker Compose
docker compose up -d

# With Docker directly
docker run --rm -it -p 4000:4000 -v $(pwd):/srv/jekyll jekyll/jekyll jekyll serve
```

Site serves at http://localhost:4000/awesome-prometheus-alerts.

## Contributing Rules

All rule changes go in `_data/rules.yml`. Each rule needs: `name`, `description`, `query` (valid PromQL), and `severity`. The `for` field is optional. Descriptions should be factual ("what") and include root cause hints ("why"). Queries must be tested against the latest exporter version. Never modify files in `dist/` — they are auto-generated on merge.

## Query Validation

- When adding or updating an alert, verify that the PromQL query references metric series that actually exist in the related exporter. Check the exporter's documentation or source code to confirm series names.
- If a metric series has been deprecated or removed in a newer version of the exporter, update the query to use the replacement series, or remove the rule if no replacement exists. Known examples: `kube_hpa_*` renamed to `kube_horizontalpodautoscaler_*` in kube-state-metrics 2.x; `node_hwmon_temp_alarm` does not exist (correct: `node_hwmon_temp_crit_alarm_celsius`); node-exporter CLI flags get renamed across versions.
- When writing or reviewing a query, search the internet (exporter docs, GitHub issues, changelogs) to validate correctness and catch outdated series names.
- Pay special attention to metric naming conventions: many exporters add `_total` suffixes for counters and `_seconds_total` for time-based counters. Verify the exact name from source code, not just docs. Known examples: Spark's PrometheusResource adds `_total` and `_seconds_total` suffixes (e.g., `metrics_executor_failedTasks_total`, not `metrics_executor_failedTasks`); Oracle's `oracledb_sessions_value` not `oracledb_sessions_activity`.
- Verify that label names used in `{{ $labels.xxx }}` template variables actually exist on the metric. Check the exporter source code for the exact label names. Known examples: cloudflare/ebpf_exporter uses `id` not `name` for programs, and `config` not `name` for decoder errors.
- When a metric uses info-style patterns (value always 1, information carried in labels), `== 0` will never be true — the metric simply won't exist. Use `absent()` instead. Known example: `ebpf_exporter_enabled_configs`.
- Some metrics are version-dependent. When a metric was renamed or removed in a newer version, add a comment noting the version requirement. Known examples: `go_memstats_gc_cpu_fraction` removed in client_golang v1.12+; cert-manager renamed `certmanager_http_acme_client_request_count` to `certmanager_acme_client_request_count` in v1.19+.
- Verify the unit of a metric before setting thresholds. Some metrics use milliseconds while descriptions assume seconds. Known example: Keycloak's `keycloak_request_duration` is in milliseconds, so `> 2` means 2ms not 2s.
- Some exporters expose labels that differ between services even within the same ecosystem. Known example: OpenStack Neutron uses `adminState="up"` while Nova and Cinder use `adminState="enabled"`.
- When an official mixin exists for a service, compare thresholds and time windows against it. Known deviations to watch for: Mimir store-gateway sync uses 1800s (not 600s), Mimir compactor skipped blocks uses `[24h]` (not `[5m]`), Tempo normalizes outstanding blocks per worker.

## Common Review Pitfalls (learned from PR history)

These are the most frequent issues raised during code review on this repo:

### Severity levels
- `critical` = requires immediate human attention. Do not use for informational/security notifications.
- `warning` = needs attention soon but not urgent.
- `info` = awareness only (e.g., config changes, underutilized resources).
- Authentication failures, security notifications, and config-change detections are typically `info`, not `critical`.

### `for` duration
- Omit `for` when the default (0m) is intentional and appropriate — do not add `for: 0m` explicitly.
- Add a `for` duration (e.g., `for: 2m` or `for: 5m`) to tolerate brief unavailability from restarts or transient spikes. Most "service down" rules should have at least `for: 1m`–`2m`.
- Do not blanket-change all `for: 0m` to `for: 1m` — it depends on the alert's semantics and the range window used in `increase()`/`rate()`.

### Query design
- Prefer symptom-based alerts over cause-based alerts to reduce alert fatigue. Example: "service is unreachable" is better than "specific internal counter changed". Metrics like heap object count, allocation rate, or free heap slots are causes, not symptoms — prefer GC duration, latency, or error rate alerts instead.
- Don't add unnecessary aggregation (`avg()`, `avg_over_time()`) on metrics that are local to a single node/instance. Only aggregate when the alert is cluster-wide.
- Don't combine `min_over_time()[1m]` with `for: 2m` redundantly — pick one mechanism for smoothing. Same applies to `avg_over_time()[5m]` with `for: 5m`.
- Remove unnecessary label filters (e.g., `job="cassandra"` or `cluster=~".*"`) that add noise without value.
- Verify comparison operators match the intent — e.g., "high snapshot count" must use `> N`, not `< N`.
- When dividing counters (e.g., error rate = errors / total), guard against division by zero with `and total > 0` or filter appropriately. This is the most common issue in new PRs — check every ratio query.
- Filter out system/template databases explicitly in DB queries (e.g., PostgreSQL: add `datid!="0"` alongside `datname!~"template.*|postgres"`).
- Never use `rate()` on a gauge metric — use `deriv()` instead. `rate()` is for monotonically increasing counters only.
- When using `increase()` for ratio calculations, prefer `rate()` instead — `increase()` can produce incorrect results when counters reset mid-window.
- When filtering gRPC error codes, don't use `grpc_code!="OK"` — this includes normal application responses like `NotFound`, `AlreadyExists`, and `Cancelled`. Filter to actual errors: `grpc_code=~"Internal|Unavailable|DeadlineExceeded|ResourceExhausted|Aborted|Unknown"`.
- When computing ratios with `rate()` on a metric that is itself already a normalized rate (e.g., Oracle's `v$waitclassmetric`), applying `rate()` computes the rate-of-change of a rate, which is not meaningful.
- When a multi-label metric is used in a binary operation with a metric that has fewer labels, use `ignoring(extra_label)` to avoid join failures. Known example: `systemd_unit_tasks_current / ignoring(type) systemd_unit_tasks_max`.
- When a query groups by labels (e.g., `by (le, worker)`), consider the cardinality impact — hundreds of label values means hundreds of independent alerts.
- Ensure `{{ $value | humanizeDuration }}` is only used on values in seconds. If the metric is in milliseconds, divide by 1000 first or use `{{ $value | humanize }}ms`.
- Avoid using `up{job=~"exporter-name"} == 0` or `absent(up{job=~"exporter-name"})` to detect whether a service is down. When targets are managed via service discovery or a job reaches multiple targets, a disappeared target causes the `up` series to become stale and vanish rather than drop to 0, so the alert never fires. Prefer application-level or cluster-level metrics instead (e.g., "number of consul cluster members < 3", "PostgreSQL primary node absent").

### Thresholds
- Alert thresholds are inherently arbitrary and depend on workload. Use `comments:` to note this when a threshold is a rough default.
- When threshold values in a PR seem unreasonable (too high or too low), challenge them with real-world reasoning or exporter docs.
- Watch for thresholds that are so high they only catch catastrophic scenarios and miss real problems. Examples: Go goroutine spike at 100/s (misses gradual leaks), Ruby major GC at 5/s (only fires if app is non-functional), Python gen2 GC at >1/s (extremely rare).
- Watch for thresholds that will fire on normal healthy operation. Examples: Memcached at 90% memory is desired (it's a cache), Flink TaskManager at 90% JVM heap is normal, cache hit rate < 80% is common for cold caches.
- For SNMP bandwidth utilization, `ifSpeed` (Gauge32) maxes at ~4.29 Gbps. For 10G+ interfaces, use `ifHighSpeed * 1000000` instead.
- For alerts using `> 0` on counters with `rate()` or `increase()`, consider whether a single event truly warrants alerting. In most cases, a small threshold (e.g., `> 0.05` for rate, `> 3` for increase) better distinguishes real problems from transient noise.

### Comments
- When an alert or its query needs explanation (e.g., non-obvious PromQL logic, threshold rationale, edge cases), use the rule-level `comments:` field. Use multiline comments when needed.
- Use the exporter-level `comments:` field for notes that apply to all rules under that exporter (e.g., exporter version requirements, known quirks, setup prerequisites).
- Comments are rendered as YAML `#` comments in the output, so they are visible to users who copy-paste the rules.

### Descriptions
- Keep descriptions short, factual, and actionable.
- Include what is happening ("Disk is almost full") and why it matters or what to check.
- Use `{{ $labels.instance }}`, `{{ $value }}`, and other template variables in descriptions when useful.
- If the description says "average" but the query uses `histogram_quantile(0.95, ...)`, fix the description to say "p95" (or vice versa).
- When alerting on rates or ratios that may not be intuitive, include `{{ $value }}` in the description so operators can see the actual number.

### Structure
- Some services have multiple exporters (e.g., MongoDB has `percona/mongodb_exporter` and `dcu/mongodb_exporter`). Place rules under the correct exporter.
- Search for duplicates before adding a new rule — a similar alert may already exist under a different exporter or with different thresholds.
- The `slug` field must be unique per exporter and is used for download URLs.

## Reference Sources for Cross-Checking Alerts

Use these sources to criticize and validate PromQL queries, compare thresholds, and find inspiration for new rules.

Everytime you consume an external resource to change a PromQL query, please compare before/after and explain why you think the external source is right.

### Official project mixins (alerts maintained by the project itself)
- https://github.com/prometheus/node_exporter/tree/master/docs/node-mixin/alerts
- https://github.com/prometheus/prometheus/tree/main/documentation/prometheus-mixin
- https://github.com/prometheus/alertmanager/tree/main/doc/alertmanager-mixin
- https://github.com/prometheus/snmp_exporter/tree/main/snmp-mixin
- https://github.com/prometheus/mysqld_exporter/tree/main/mysqld-mixin
- https://github.com/prometheus-community/postgres_exporter/tree/master/postgres_mixin
- https://github.com/prometheus-community/elasticsearch_exporter (mixin via Grafana docs)
- https://github.com/etcd-io/etcd/tree/main/contrib/mixin
- https://github.com/thanos-io/thanos/tree/main/mixin (also: examples/alerts/)
- https://github.com/grafana/loki/tree/main/production/loki-mixin (also: promtail-mixin/)
- https://github.com/grafana/mimir/tree/main/operations/mimir-mixin
- https://github.com/grafana/tempo/tree/main/operations/tempo-mixin
- https://github.com/grafana/grafana/tree/main/grafana-mixin
- https://github.com/ceph/ceph/tree/main/monitoring/ceph-mixin (in-tree; also https://github.com/ceph/ceph-mixins)
- https://github.com/jaegertracing/jaeger/tree/main/monitoring/jaeger-mixin
- https://github.com/kubernetes-monitoring/kubernetes-mixin (includes runbook.md)
- https://github.com/kubernetes/kube-state-metrics/tree/main/jsonnet/kube-state-metrics-mixin
- https://github.com/prometheus-operator/prometheus-operator/tree/main/jsonnet/mixin
- https://github.com/prometheus-operator/kube-prometheus
- https://github.com/cortexproject/cortex-jsonnet
- https://github.com/gluster/gluster-mixins

### Standalone mixin repositories
- https://github.com/povilasv/coredns-mixin
- https://github.com/adinhodovic/rabbitmq-mixin
- https://github.com/adinhodovic/blackbox-exporter-mixin
- https://github.com/adinhodovic/django-mixin
- https://github.com/adinhodovic/argo-cd-mixin
- https://github.com/adinhodovic/ingress-nginx-mixin
- https://github.com/adinhodovic/kubernetes-autoscaling-mixin
- https://github.com/metalmatze/kube-cockroachdb (CockroachDB on Kubernetes)
- https://github.com/bitnami-labs/sealed-secrets (sealed-secrets mixin)
- https://github.com/lukas-vlcek/elasticsearch-mixin (includes runbook.md)
- https://github.com/adinhodovic/postgresql-mixin
- https://github.com/imusmanmalik/cert-manager-mixin
- https://gitlab.com/uneeq-oss/cert-manager-mixin (alternative cert-manager mixin)
- https://github.com/uneeq-oss/spinnaker-mixin
- https://github.com/metalmatze/slo-libsonnet (SLO alerting/recording rules generation library)

### Grafana jsonnet-libs (93 mixins — browse for specific services)
- https://github.com/grafana/jsonnet-libs
- Notable mixins with alerts: consul, memcached, elasticsearch, haproxy, clickhouse, opensearch, redis, mongodb, kafka, nginx, rabbitmq, jvm, vault, envoy, istio, jenkins, caddy, cloudflare, docker, traefik, windows, snmp, argocd, nomad, pgbouncer, minio, ceph, and 60+ more.

### Mixin aggregators
- https://monitoring.mixins.dev/ (central registry of all monitoring mixins)
- https://github.com/monitoring-mixins/website/blob/master/mixins.json (machine-readable list of all mixins with source URLs)
- https://github.com/nlamirault/monitoring-mixins (hub aggregating many mixins)

### GitLab monitoring & infrastructure
- https://gitlab.com/gitlab-com/runbooks (GitLab.com SRE runbooks — production alert rules, runbook docs, alertmanager config)
- https://gitlab.com/gitlab-com/runbooks/-/tree/master/mimir-rules (production Mimir alerting rules organized by tenant/environment)
- https://gitlab.com/gitlab-com/runbooks/-/tree/master/mimir-rules-jsonnet (jsonnet sources for GitLab alerting rules)
- https://gitlab.com/gitlab-org/omnibus-gitlab/-/tree/master/files/gitlab-cookbooks/monitoring/templates/rules (default Prometheus rules shipped with GitLab Omnibus)

### Community alert collections
- https://github.com/jpweber/prometheus-alert-rules
- https://github.com/bdossantos/prometheus-alert-rules
- https://github.com/giantswarm/prometheus-rules
- https://github.com/last9/awesome-prometheus-toolkit
- https://github.com/warpnet/awesome-prometheus (meta-list of Prometheus resources)
