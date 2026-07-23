# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A curated collection of ~940 Prometheus alerting rules covering 90+ services across 100+ exporters, organized in categories: basic resource monitoring (Prometheus, host/hardware, SMART, Docker, Blackbox, Windows, VMware, Netdata), databases (MySQL, PostgreSQL, Redis, MongoDB, Elasticsearch, Cassandra, Clickhouse, CouchDB, etc.), message brokers (RabbitMQ, Kafka, Pulsar, Nats, Zookeeper), proxies/load balancers/service meshes (Nginx, Apache, HaProxy, Traefik, Caddy, Linkerd, Istio), runtimes (PHP-FPM, JVM, Sidekiq), data engineering (Apache Flink, Apache Spark, Hadoop), orchestrators (Kubernetes, Nomad, Consul, Etcd, OpenStack), CI/CD (Jenkins, ArgoCD, FluxCD, GitLab CI, Spinnaker), network and security (SSL/TLS, CoreDNS, Vault, Cloudflare, Cilium, eBPF), storage (Ceph, ZFS, OpenEBS, Minio), cloud providers (AWS, Azure, DigitalOcean), observability (Thanos, Loki, Cortex, OpenTelemetry Collector, Grafana Tempo/Mimir/Alloy, Jaeger), and other (APC UPS, Graph Node).

All rules are stored in a single YAML data file (`_data/rules.yml`) and rendered as a static site built with Astro + TypeScript (located in `site/`). The site provides copy-pasteable Prometheus alert snippets and downloadable rule files per exporter.

The project is community-driven. Most contributions are PRs adding or updating rules in `_data/rules.yml`. Files in `dist/rules/` are auto-generated on merge — never edit them manually.

## Architecture

- **`_data/rules.yml`** — The single source of truth for all alerting rules. This is the main file contributors edit. It is NOT a valid Prometheus config; the site renders each rule into copy-pasteable Prometheus alert format.
- **`site/`** — Astro + TypeScript static site. Run `npm run dev` inside this directory to develop locally.
- **`site/src/data/rules.ts`** — Typed wrappers and helper functions over `_data/rules.yml`.
- **`site/src/data/site.ts`** — Shared site metadata constants (URLs, author, schema objects).
- **`site/src/pages/`** — Astro page routes: `index.astro` (homepage), `rules/[group]/[service].astro` (per-service rule pages), `alertmanager.astro`, `blackbox-exporter.astro`, `sleep-peacefully.astro` (guides).
- **`site/src/layouts/BaseLayout.astro`** — Root HTML layout (SEO, GA, dark mode).
- **`site/src/layouts/GuideLayout.astro`** — Layout for guide pages (TOC, hero, related guides).
- **`site/src/components/`** — Shared Astro components (Header, Footer, Sidebar, RuleCard, ExporterSection, etc.).
- **`site/astro.config.mjs`** — Astro configuration (sitemap, Vite YAML plugin, base URL).
- **`dist/rules/`** — Pre-built downloadable rule files organized by service/exporter (referenced in the site for `wget` commands).

## Rules YAML Structure

Services are listed in README.md.

`_data/rules.yml` hierarchy:
```
groups:
  - name: "<category>"        # e.g. "Basic resource monitoring"
    services:
      - name: "<service>"     # e.g. "Host and hardware"
        logo: "<path>"             # /images/services/<service-slug>.svg, see naming rule below
        exporters:
          - name: "<exporter>"     # optional, see naming rule below
            slug: "<slug>"          # used for download URLs, kebab-case, unique per exporter
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

Field order for a rule is always `name`, `description`, `query`, `severity`, `for`, `comments` — keep new
rules in this order even though a few legacy rules interleave `comments` earlier.

### Rule ordering within an exporter

Within each exporter's `rules:` list, order rules by category, not by add date or alphabetically. An
operator scanning an exporter's page top-to-bottom should read it the way they'd triage the service
during an incident: "is it up?" before "is it slow?" before "is it running low on something?" before
"is this just an FYI?". The categories, in order:

1. **Availability** — the instance/service/cluster is down or unreachable: liveness checks (see
   "Service-down pattern" below), `absent()` checks, quorum/leader loss, replication broken/disconnected,
   election/failover/split-brain. This is what a human needs to know first: is there anyone home.
2. **Resource saturation (USE: Utilization / Saturation / Errors)** — CPU, memory, disk/filesystem,
   network, file descriptors, connection pools. Group rules by resource (all CPU rules together, then all
   memory rules, then all disk rules, etc.) rather than interleaving resources — this keeps a hard
   threshold and its predictive/soft-threshold sibling adjacent (e.g. "disk almost full" next to "disk
   predicted to fill within 24h"), instead of separated by an unrelated resource's alerts.
3. **Performance and errors (RED: Rate / Errors / Duration)** — latency, error rate, timeouts, queue/lag
   backlog, failed jobs, retries, GC pauses, crash-loop/restart-count alerts. The service is up and
   resources look fine, but symptoms indicate degraded behavior.
4. **Capacity and trend** — non-resource capacity concerns that don't fit under a specific USE resource:
   backups/snapshots missing or outdated, quota/license approaching limits, long-term growth trends.
5. **Info, security, and config** — config reload failures, certificate/TLS expiry, auth failures,
   security notifications, config-change detections. Usually `severity: info` (see "Severity levels"
   below), read last because they're awareness-only, not triage priorities.

Within the same category, order by severity (`critical`, then `warning`, then `info`); ties within the
same category and severity keep their existing relative order rather than being reshuffled arbitrarily.

Mark each category boundary with a plain `#` comment (see "Comments" below — this is the source-only
scope, stripped at render time, not the rule-level `comments:` field) directly above the first rule of
that category, with no blank line before it:

```yaml
              #
              # {Category name}
              #
              - name: "<first rule of this category>"
```

Use the category name as written above (`Availability`, `Resource saturation (USE)`, `Performance and
errors (RED)`, `Capacity and trend`, `Info, security, and config`). Omit the header for a category that
has no rules in a given exporter.

## YAML Authoring Conventions

These are patterns observed consistently across the ~940 existing rules in `_data/rules.yml` but not
enforced by any schema. Follow them for new/edited entries so the file stays uniform.

### Naming fields

- `logo`: `/images/services/<service-slug>.svg`, where `<service-slug>` is the service `name` lowercased
  with every run of non-alphanumeric characters collapsed to a single `-` (e.g. "S.M.A.R.T Device
  Monitoring" → `s-m-a-r-t-device-monitoring.svg`).
- Exporter `name`: the GitHub `org/repo` for third-party exporters (e.g. `oliver006/redis_exporter`), a
  human label for native/embedded exporters (e.g. `Embedded exporter`, `Embedded exporter (Patroni >=
  2.1.0)`), or omitted entirely when only a `slug` is needed.
- `slug`: kebab-case, unique per exporter, vendor/org-prefixed for third-party exporters (e.g.
  `percona-mongodb-exporter`, `spreaker-pgbouncer-exporter`). Native exporters use `embedded-exporter`;
  when a service ships several native exporter variants, disambiguate with a suffix (e.g.
  `embedded-exporter-v2`, `embedded-exporter-legacy`).

### Alert naming

- Human-readable and service-prefixed, e.g. `Redis too many connections`, `Host out of memory` — not the
  PascalCase alertnames used by upstream mixins (the site renders the PascalCase form separately).
- Use `<Service> down` for the canonical liveness check (see "Service-down pattern" below).
- Echo the threshold in parentheses when it helps scanning, e.g. `MySQL too many connections (> 80%)`.

### Descriptions and value formatting

- Keep it a short factual sentence; put the threshold in parentheses when useful.
- Identify the instance as `on {{ $labels.instance }}` or `(instance {{ $labels.instance }})`.
- Format `{{ $value }}` with the formatter matching its unit: `printf "%.2f"` / `printf "%.0f"` for plain
  decimals, `humanize` / `humanize1024` for byte counts (append `B`, e.g. `{{ $value | humanize1024 }}B`), `humanizeDuration`
  for seconds, `humanizePercentage` for 0–1 ratios. See "Descriptions" below for the humanizeDuration
  seconds-vs-milliseconds pitfall.

### Service-down pattern

For any stateful service exporting its own liveness gauge, use this exact shape:

```yaml
- name: "<Service> down"
  description: "<Service> instance is down on {{ $labels.instance }}"
  query: "<exporter>_up == 0"
  severity: critical
  for: 1m
  comments: |
    1m delay allows a restart without triggering an alert.
```

This relies on the exporter's own application-level `_up` gauge, which is the recommended way to detect a
down instance — distinct from the discouraged `up{job=~"..."} == 0` target-liveness check described in
"Query design" below (which misses staleness on service-discovered/multi-target jobs).

### Reusable boilerplate comments

Reuse these verbatim where they apply, instead of rewording:

- Restart tolerance: `1m delay allows a restart without triggering an alert.`
- Arbitrary/workload-dependent threshold: `Threshold of X is arbitrary. Adjust ... to your workload.` (or
  `... is a rough default. Adjust based on your workload.`) — see "Thresholds" below for when to add this.

## Running Locally

```bash
cd site
npm install
npm run dev
```

Site serves at http://localhost:4321/awesome-prometheus-alerts.

To build for production:

```bash
cd site
npm run build
npm run preview
```

## Contributing Rules

All rule changes go in `_data/rules.yml`. Each rule needs: `name`, `description`, `query` (valid PromQL), and `severity`. The `for` field is optional. Descriptions should be factual ("what") and include root cause hints ("why"). Queries must be tested against the latest exporter version. Never modify files in `dist/` — they are auto-generated on merge.

## Query Validation

- When adding or updating an alert, verify that the PromQL query references metric series that actually exist in the related exporter. Check the exporter's documentation or source code to confirm series names.
- If a metric series has been deprecated or removed in a newer version of the exporter, update the query to use the replacement series, or remove the rule if no replacement exists. Known examples: `kube_hpa_*` renamed to `kube_horizontalpodautoscaler_*` in kube-state-metrics 2.x; `node_hwmon_temp_alarm` does not exist (correct: `node_hwmon_temp_crit_alarm_celsius`); node-exporter CLI flags get renamed across versions.
- When writing or reviewing a query, search the internet (exporter docs, GitHub issues, changelogs) to validate correctness and catch outdated series names. When you are not sure about a metric name, always search the internet to confirm it exists and is spelled correctly before using it.
- Pay special attention to metric naming conventions: many exporters add `_total` suffixes for counters and `_seconds_total` for time-based counters. Verify the exact name from source code, not just docs. Known examples: Spark's PrometheusResource adds `_total` and `_seconds_total` suffixes (e.g., `metrics_executor_failedTasks_total`, not `metrics_executor_failedTasks`); Oracle's `oracledb_sessions_value` not `oracledb_sessions_activity`.
- Verify that label names used in `{{ $labels.xxx }}` template variables actually exist on the metric. Check the exporter source code for the exact label names. Known examples: cloudflare/ebpf_exporter uses `id` not `name` for programs, and `config` not `name` for decoder errors.
- When a metric uses info-style patterns (value always 1, information carried in labels), `== 0` will never be true — the metric simply won't exist. Use `absent()` instead. Known examples: `ebpf_exporter_enabled_configs`, `istio_build`. This also defeats range functions: `avg_over_time(istio_build[1m]) < 1` can never fire, because every sample in the window is `1` until the series vanishes and the expression returns no data at all.
- A single metric name can mix counters and gauges, discriminated by a label — the exporter's declared type is then meaningless and correctness rests entirely on the label selector. Known example: `couchdb_replicator_jobs` / `couchdb_replicator_connections` (gesellix exporter declares both `GaugeVec`, but CouchDB's `stats_descriptions.cfg` types them per `metric` label): `crashes`, `starts`, `stops`, `adds`, `removes`, `owner_crashes`, `worker_crashes` are counters (use `rate()`/`increase()`), while `running`, `pending`, `total`, `crashed` are gauges (compare directly). `increase(couchdb_replicator_jobs{metric="running"}[5m])` would be silently wrong and neither the exporter nor promtool would catch it.
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
- Before writing `max by (...)` / `min by (...)`, check whether the metric's own labels already identify a single instance. If they do, the aggregation collapses nothing and only drops `instance` — the label naming the pod to fix. Known example: `tempo_ingest_group_partition_lag_seconds` carries only `group` and `partition`, and Tempo derives `group` from the StatefulSet prefix and `partition` from the pod ordinal, so `(group, partition)` is already one pod. Aggregate only to cross instances on purpose (e.g. `min by (partition)` across zones to mean "every owner is lagging").
- Never combine `avg_over_time()` (or any `*_over_time()` smoothing) with a `for:` — that declares the same window twice. Pick one, based on how the metric behaves:
  - The metric swings and dips back under the threshold within the interval → use `avg_over_time()`. A `for:` requires a *continuous* breach, so every dip resets its timer and the alert never fires.
  - The metric is not expected to vary much → use `for:`. It is cheaper and keeps the raw current value, which `avg_over_time()` obscures.
- Use `*_over_time()` sparingly: it loads every sample in the range window, so it is far more costly than a `for:` on a raw gauge. Reach for it only when the volatility above actually demands it.
- For projection alerts ("resource X exhausted in N days", typically `predict_linear()`), fit the trend over a multi-day range window (e.g. `[3d]`/`[7d]`), not hours — a short window lets a transient spike or a daily cycle dominate the slope and produce wild over/under-estimates. And set the lead time generously: project at least 4 days ahead of the critical point (e.g. `predict_linear(node_filesystem_avail_bytes[3d], 4 * 24 * 3600) < 0`), so a breach forecast landing on a weekend or public holiday still surfaces while the team is around to act.
- Remove unnecessary label filters (e.g., `job="cassandra"` or `cluster=~".*"`) that add noise without value.
- Verify comparison operators match the intent — e.g., "high snapshot count" must use `> N`, not `< N`.
- When dividing counters (e.g., error rate = errors / total), guard against division by zero with `and total > 0` or filter appropriately. This is the most common issue in new PRs — check every ratio query.
- Filter out system/template databases explicitly in DB queries (e.g., PostgreSQL: add `datid!="0"` alongside `datname!~"template.*|postgres"`).
- Never use `rate()` on a gauge metric — use `deriv()` instead. `rate()` is for monotonically increasing counters only.
- A `_total` suffix does not make a metric a counter. Several exporters expose gauges under a `_total` name; wrapping those in `rate()`/`increase()` is the bug, and direct comparison is correct. The decisive check in the source is `Inc()` paired with `Dec()` (or a `.Set()`), and a `GaugeValue`/`NewGaugeVec` declaration. Known examples: `argocd_repo_pending_request_total` (`NewGaugeVec`, `Inc()`/`Dec()` — count of currently-pending requests, drains when locks release), `phpfpm_processes_total{state=...}` (`prometheus.GaugeValue`).
- Conversely, never use `deriv()` or `delta()` on a metric that is a cumulative counter, even if the exporter declares it as `untyped`. The only reliable way to determine whether a metric is a counter or a gauge is to check whether it monotonically increases and resets on restart — not just the declared type. Known examples of untyped metrics with counter semantics: `node_vmstat_*` (e.g., `node_vmstat_pgmajfault`, `node_vmstat_oom_kill`) from node_exporter (cumulative values from /proc/vmstat — the official node_exporter mixin uses `rate()`); MySQL `SHOW GLOBAL STATUS` variables via mysqld_exporter (e.g., `mysql_global_status_slow_queries`, `mysql_global_status_innodb_log_waits`, `mysql_global_status_questions` — all monotonically increasing, use `rate()`/`increase()`); `systemd_socket_refused_connections_total`, declared outright `GaugeValue` while its sibling `systemd_socket_accepted_connections_total` — same D-Bus `uint32`, read on the adjacent line — is declared `CounterValue`.
- PromQL never reads the declared `# TYPE` at query time: `rate()`, `increase()`, `delta()` and `deriv()` only ever see float sample values. "The exporter declares it a gauge, therefore `delta()`" is a non-sequitur — the declaration cannot make `deriv()` correct. Decide from behaviour (monotonic + resets on restart), then pick the function. This matters because the wrong choice fails *silently*: `deriv()` approximates the slope of a counter perfectly well in steady state, and only goes negative across the reset — i.e. the alert breaks at the exact moment it should fire (reboot, service restart).
- When using `increase()` for ratio calculations, prefer `rate()` instead — `increase()` can produce incorrect results when counters reset mid-window.
- When filtering gRPC error codes, don't use `grpc_code!="OK"` — this includes normal application responses like `NotFound`, `AlreadyExists`, and `Cancelled`. Filter to actual errors: `grpc_code=~"Internal|Unavailable|DeadlineExceeded|ResourceExhausted|Aborted|Unknown"`.
- When computing ratios with `rate()` on a metric that is itself already a normalized rate (e.g., Oracle's `v$waitclassmetric`), applying `rate()` computes the rate-of-change of a rate, which is not meaningful.
- When a multi-label metric is used in a binary operation with a metric that has fewer labels, use `ignoring(extra_label)` to avoid join failures. Known example: `systemd_unit_tasks_current / ignoring(type) systemd_unit_tasks_max`.
- Never write `rate(a) or rate(b)` to mean "a or b is happening". `rate()` drops `__name__`, so both operands end up with identical label sets, and `or` keeps only elements of the right side that have *no* match on the left — i.e. it silently discards `rate(b)` entirely and degenerates into `rate(a)`. This is worse when `a` is always present (Vault increments `vault_audit_log_request_failure` on every request, with `0.0` on success, so the masking branch is always taken). Compare each side against its threshold *before* the `or`: `sum(rate(a[5m])) by (instance) > 0 or sum(rate(b[5m])) by (instance) > 0`. Note `sum(rate({__name__=~"a|b"}[5m]))` does not work either — it errors with "vector cannot contain metrics with the same labelset".
- When a query groups by labels (e.g., `by (le, worker)`), consider the cardinality impact — hundreds of label values means hundreds of independent alerts.
- Ensure `{{ $value | humanizeDuration }}` is only used on values in seconds. If the metric is in milliseconds, divide by 1000 first or use `{{ $value | humanize }}ms`.
- Avoid using `up{job=~"exporter-name"} == 0` to detect whether a service is down. When targets are managed via service discovery or a job reaches multiple targets, a disappeared target causes the `up` series to become stale and vanish rather than drop to 0, so the alert never fires. Prefer application-level or cluster-level metrics instead (e.g., "number of consul cluster members < 3", "PostgreSQL primary node absent").
- `absent(up{...} == 1)` is **not** an instance of the rule above — it is the fix for it. `absent()` fires *because* the series vanished, which is the failure mode `== 0` misses. Its actual limitation is different: it is cluster-wide (fires only once every matching target is gone) and cannot name the failing instance. To alert on one specific job/instance disappearing rather than waiting for the whole cluster to go dark, pin its identity into the selector as an equality matcher (e.g. `absent(up{job="x", instance="y"})`) — those are also the only labels `absent()` propagates onto the resulting alert. Because of this, one `absent()` rule covers exactly one job/instance combination, so an environment tracking several jobs/instances individually needs roughly as many `absent()` rules. Always pair `absent()` with a `for:` (e.g. `for: 5m`) so it doesn't fire on Prometheus's own startup, before the first scrape has populated the series.

### Thresholds
- Not every threshold deserves a "rough default, adjust to your workload" `comments:` note — only add one when the *right value* depends on something external to server/cluster hardware sizing. Test: "would a bigger or smaller server/cluster change the right value?" If no, skip the comment — this covers ratios/percentages of a resource's own capacity (connection-pool %, heap %, error-rate ratio, node-down %), which are self-normalizing and stay valid at any scale, and occurrence-counts of an event that should never repeat (`> 0` alarms, "job lost", "node offline", structural mismatches), which are bad regardless of scale. Add the comment only when the value tracks traffic composition, business exposure, or an external plan/commitment, and name that variable specifically rather than writing a generic "adjust to your workload." Known no-comment-needed examples: MySQL connections > 80%, Flink JobManager / HBase Region Server heap > 90%/80%, Ceph OSD-down >= 10%, host NIC transmit-error rate > 1%, PHP-FPM max-children-reached 3x/5m — all size-invariant. Known comment-needed examples: Nginx/Traefik 4xx rate > 5% (client-error rate varies by app: bots, rate limits, API misuse), Cloudflare threat count > 3/5m (scales with the app's popularity/exposure, not its server size), JVM objects-pending-finalization > 1000 (depends on the app's own allocation pattern and heap size), SpeedTest download < 100 Mbps (tied to the user's ISP plan, not their hardware).
- HTTP/RPC error-rate ratios split further, even though both read as "ratio tracking traffic composition" at first glance: **5xx** (or generic infra-fault codes/results — gRPC `Internal`/`Unavailable`/`DeadlineExceeded`/`Unknown`, `result="error"`, a KV-store/backend "too many failed X") should be ~0% regardless of infra — these are server-side faults, not client behavior, so skip the comment. **4xx** (client-driven) rates genuinely vary — add a comment naming concrete causes: bots, API misuse, rate limits (429s), short-lived token expiry (401s), malformed clients/scanners. A ratio that mixes both in one query (e.g. `status_code=~"4xx|5xx"`) still needs a comment, but say so explicitly rather than picking one framing. Latency thresholds (ms/s, percentiles) are not self-normalizing either — acceptable latency varies by route and SLA, so add a comment there too, e.g. "acceptable latency varies by route and your SLA — adjust based on your baseline."
- Boolean/complete-failure checks (`== 1` meaning 100% failure, or a ratio that can only ever be 0 or 1) are not graduated thresholds — there is nothing to tune, so skip the comment, same as any other occurrence/state detector. Also skip a ratio that is already a percentage of the metric's own configured limit (e.g. `inflight_requests / max_inflight_requests_limit * 100 > 80`) even if the query happens to contain a traffic-sounding word like "request" — it is self-normalizing like any other capacity ratio (MySQL connections, heap %), not traffic-composition-dependent.
- When the metric is itself defined relative to a config value the operator already controls (e.g. `phpfpm_slow_requests_total` counts requests exceeding the operator-set `request_slowlog_timeout`), do not frame the comment as "adjust this ratio to your workload" — name the actual config knob to tune instead, e.g. "if this fires too often or too rarely, tune request_slowlog_timeout rather than this ratio threshold."
- Prefer relative (proportional) thresholds over absolute ones. These rules are copied into many environments that mix clusters of the same technology at wildly different scales, so an absolute value that fits one deployment is wrong for the next. Express the threshold as a fraction of a capacity, budget, or reference series the query itself carries, so it self-adjusts:
  - Saturation → compare against the resource's own limit/capacity, not a hard-coded amount: `node_network_transmit_bytes_total` rate vs `node_network_speed_bytes` (fire at 80% of link speed, not "> 100MB/s"); connections vs `max_connections` (fire at > 80% of available slots, not "> 500"); used vs total for memory/disk/file-descriptors/pool slots.
  - Flow balance → compare the two sides of a pipeline instead of thresholding one: a queue is backing up when consumption stays below ~75% of production for a sustained window, which generalizes across throughputs where any fixed backlog count would not.
  - Error ratio → threshold the failure fraction, not the raw failure count: alert when more than 5% of requests through a proxy error out (`sum(rate(errors[5m])) / sum(rate(total[5m])) > 0.05`, guarding the denominator per the ratio rule in "Query design"), so it holds whether the proxy sees 10 or 10,000 req/s where a fixed "> N errors/s" would fire constantly on a busy node and never on a quiet one.
  - When no capacity series exists, a percentage/ratio is still more portable than a raw count.
  Absolute thresholds are acceptable only when the metric has a workload-independent meaning (latency in seconds, error ratio, TLS days-to-expiry).
- Alternatively, encode a service-level objective directly as the threshold when the service has one: e.g. cap replication lag at 10s, p99 latency at a target, error budget burn rate. An SLO is portable because it expresses the acceptable user-facing outcome, not an infrastructure size.
- Alert thresholds are inherently arbitrary and depend on workload. Use `comments:` to note this when a threshold is a rough default.
- When threshold values in a PR seem unreasonable (too high or too low), challenge them with real-world reasoning or exporter docs.
- Watch for thresholds that are so high they only catch catastrophic scenarios and miss real problems. Examples: Go goroutine spike at 100/s (misses gradual leaks), Ruby major GC at 5/s (only fires if app is non-functional), Python gen2 GC at >1/s (extremely rare).
- Watch for thresholds that will fire on normal healthy operation. Examples: Memcached at 90% memory is desired (it's a cache), Flink TaskManager at 90% JVM heap is normal, cache hit rate < 80% is common for cold caches.
- For SNMP bandwidth utilization, `ifSpeed` (Gauge32) maxes at ~4.29 Gbps. For 10G+ interfaces, use `ifHighSpeed * 1000000` instead.
- For alerts using `> 0` on counters with `rate()` or `increase()`, consider whether a single event truly warrants alerting. In most cases, a small threshold (e.g., `> 0.05` for rate, `> 3` for increase) better distinguishes real problems from transient noise.
- When checking a cumulative total metric (one that only resets on process restart) with `> 0`, the alert will fire permanently after the first occurrence and never resolve. Always wrap such metrics in `increase()` or `rate()` to detect new events. Known example: `opensearch_circuitbreaker_tripped_count > 0` fires forever after the first circuit breaker trip.

### Comments

Three distinct scopes exist — don't confuse them:
- Plain YAML `#` comments: source-only, for contributors reading/editing the file. Stripped at parse time, never shown on the site. Used for the file-level notice at the top of `_data/rules.yml` and occasional in-file section headers.
- Rule-level `comments:` field: rendered as a `#` comment in the copy-pasteable snippet for that one rule. Use for non-obvious PromQL logic, threshold rationale, or an edge case specific to that rule — not for restating the description.

The split is by audience, not by importance. Ask who needs the note:
- The operator copying the snippet, to run or tune the alert (threshold rationale, version requirement, a caveat that changes how they read the alert) → `comments:` field.
- The AI agent adapting a rule into another project's alerting config — same audience as the operator, but more likely to act on the note unattended. Flag values a downstream project will likely need to customize: `job=`/`instance=` label selectors, range windows, and thresholds that clear the bar in "Thresholds" below (not every threshold — see there for which ones actually warrant a note) — so the agent knows exactly which knobs to turn.
- The AI agent adapting a rule into another project's alerting config — same audience as the operator, but more likely to act on the note unattended. Don't hesitate to flag values a downstream project will likely need to customize (threshold numbers, `job=`/`instance=` label selectors, range windows) so the agent knows exactly which knobs to turn.
- The next contributor or reviewer editing the file, so they don't "fix" a rule that is already correct → plain `#` comment. Anything that would be noise inside a copy-pasted Prometheus config belongs here. Typical case: recording that a metric is a gauge despite a `_total` suffix, so nobody wraps it in `rate()` later (see the `argocd_repo_pending_request_total` and `phpfpm_processes_total` rules).
- Exporter-level `comments:` field: rendered once before all rules under that exporter. Use for notes that apply exporter-wide (version requirements, known quirks, setup prerequisites) instead of repeating the same note on every rule. Don't state the obvious (e.g. "these metrics are specific to exporter X" — the `name`/`doc_url` already say that).

A rule or exporter block may have only **one** `comments:` key. YAML silently discards the first when there are duplicate keys in the same mapping — merge multiple paragraphs into a single `comments:` field using the multiline `|` block scalar.

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
- https://github.com/opensearch-project/opensearch-prometheus-exporter (OpenSearch exporter — check metric names here)
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
