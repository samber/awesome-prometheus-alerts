# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A curated collection of ~600 Prometheus alerting rules covering 60+ services across 80+ exporters, organized in 7 categories: basic resource monitoring (Prometheus, host/hardware, SMART, Docker, Blackbox, Windows, VMware, Netdata), databases and brokers (MySQL, PostgreSQL, Redis, MongoDB, RabbitMQ, Elasticsearch, Cassandra, Clickhouse, Kafka, etc.), reverse proxies and load balancers (Nginx, Apache, HaProxy, Traefik, Caddy), runtimes (PHP-FPM, JVM, Sidekiq), orchestrators (Kubernetes, Nomad, Consul, Etcd, Istio, ArgoCD, FluxCD), network/security/storage (Ceph, ZFS, Minio, SSL/TLS, CoreDNS, Vault, Cloudflare), and observability tools (Thanos, Loki, Cortex, OpenTelemetry Collector, Jenkins).

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
- Prefer symptom-based alerts over cause-based alerts to reduce alert fatigue. Example: "service is unreachable" is better than "specific internal counter changed".
- Don't add unnecessary aggregation (`avg()`, `avg_over_time()`) on metrics that are local to a single node/instance. Only aggregate when the alert is cluster-wide.
- Don't combine `min_over_time()[1m]` with `for: 2m` redundantly — pick one mechanism for smoothing.
- Remove unnecessary label filters (e.g., `job="cassandra"` or `cluster=~".*"`) that add noise without value.
- Verify comparison operators match the intent — e.g., "high snapshot count" must use `> N`, not `< N`.
- When dividing counters (e.g., error rate = errors / total), guard against division by zero with `and total > 0` or filter appropriately.
- Filter out system/template databases explicitly in DB queries (e.g., PostgreSQL: add `datid!="0"` alongside `datname!~"template.*|postgres"`).

### Thresholds
- Alert thresholds are inherently arbitrary and depend on workload. Use `comments:` to note this when a threshold is a rough default.
- When threshold values in a PR seem unreasonable (too high or too low), challenge them with real-world reasoning or exporter docs.

### Comments
- When an alert or its query needs explanation (e.g., non-obvious PromQL logic, threshold rationale, edge cases), use the rule-level `comments:` field. Use multiline comments when needed.
- Use the exporter-level `comments:` field for notes that apply to all rules under that exporter (e.g., exporter version requirements, known quirks, setup prerequisites).
- Comments are rendered as YAML `#` comments in the output, so they are visible to users who copy-paste the rules.

### Descriptions
- Keep descriptions short, factual, and actionable.
- Include what is happening ("Disk is almost full") and why it matters or what to check.
- Use `{{ $labels.instance }}`, `{{ $value }}`, and other template variables in descriptions when useful.

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
