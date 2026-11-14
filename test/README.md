# Rule regression tests

From the repository root, with Ruby, `liquid-cli`, mikefarah/yq, jq and promtool installed:

```sh
bash test/generate.sh
promtool check rules test/rules/*/*.yml
promtool test rules test/*.test.yml
```

The generator uses the Publish workflow's Liquid template. Generated files are ignored;
change `_data/rules.yml`, not `dist/rules/`.

The fixtures evaluate complete exporter rule files, including labels, annotations and
pending periods. Their synthetic samples follow these producer contracts:

- [Spark 4.2.0 PrometheusResource.scala, lines 48–64](https://github.com/apache/spark/blob/v4.2.0/core/src/main/scala/org/apache/spark/status/api/v1/PrometheusResource.scala#L48-L64):
  both duration metrics are in seconds. The existing lifetime ratio is retained.
- [Kubernetes 1.37.0 x509.go, lines 50–74](https://github.com/kubernetes/kubernetes/blob/v1.37.0/staging/src/k8s.io/apiserver/pkg/authentication/request/x509/x509.go#L50-L74):
  classic certificate histogram boundaries, with target labels added by scraping.
  The quantile is job-wide; the count-side labels and value are retained by `and on(job)`.
- [Azure metrics exporter 25.12.0 main.go, lines 190–201](https://github.com/webdevops/azure-metrics-exporter/blob/25.12.0/main.go#L190-L201)
  and [probe_metrics_resource.go, lines 81–88](https://github.com/webdevops/azure-metrics-exporter/blob/25.12.0/probe_metrics_resource.go#L81-L88):
  the Summary observes completed collections. A 15-minute average is not an in-flight
  duration; choose a window longer than the probe interval. The slow fixture completes
  a 400-second collection every 10 minutes, with exporter stats scraped every minute.
- [GitLab 19.4.0 server_metrics.rb, lines 14–41](https://gitlab.com/gitlab-org/gitlab/-/blob/v19.4.0/lib/gitlab/sidekiq_middleware/server_metrics.rb#L14-41):
  the largest finite completion and queue-duration buckets are 300 and 60 seconds.
  The rules use a strict greater-than-5% tail-event policy above those boundaries, not
  an interpolated p95. Exactly 5% and observations exactly at the time boundary stay quiet.
- [Longhorn v1.11.0 volume_collector.go, lines 306–324](https://github.com/longhorn/longhorn-manager/blob/v1.11.0/metrics_collector/volume_collector.go#L306-L324)
  and [node_collector.go, lines 199–215](https://github.com/longhorn/longhorn-manager/blob/v1.11.0/metrics_collector/node_collector.go#L199-L215):
  robustness is one series per `state` label, 1 for the current state and 0 for the others.
  Each longhorn-manager reports only its own node, so a node that is down has no status
  series and is found by comparing with `longhorn_node_count_total`.
- [External Secrets Operator v2.15.0 esmetrics.go, lines 127–172](https://github.com/external-secrets/external-secrets/blob/v2.15.0/pkg/controllers/externalsecret/esmetrics/esmetrics.go#L127-L172)
  and [runtime/metrics/metrics.go, lines 34–52](https://github.com/external-secrets/external-secrets/blob/v2.15.0/runtime/metrics/metrics.go#L34-L52):
  the Ready condition keeps one series per status, 1 for the current one and 0 for the
  opposite one. Provider calls are counted per `provider`, `call` and `status` (`success`
  or `error`); a provider with no calls in the window stays quiet.
- [Nomad v2.1.1 state_store.go, lines 6066–6160](https://github.com/hashicorp/nomad/blob/v2.1.1/nomad/state/state_store.go#L6066-L6160):
  the job summary only adds to `Failed` (a terminal client status) and only takes from
  `Lost` when a lost allocation comes back. A failure from an hour ago stays quiet.
- [Karpenter v1.15.1 cloudprovider/metrics/cloudprovider.go, lines 64–119](https://github.com/kubernetes-sigs/karpenter/blob/v1.15.1/pkg/cloudprovider/metrics/cloudprovider.go#L64-L119)
  and [state/cluster.go, lines 152–181](https://github.com/kubernetes-sigs/karpenter/blob/v1.15.1/pkg/controllers/state/cluster.go#L152-L181):
  cloud provider errors are counted per `controller`, `method`, `provider`, `error` and
  `nodepool`, and `Cluster.Synced()` sets `karpenter_cluster_state_synced` to 1 or 0 with no labels.
  `NodeClaimNotFoundError` and `InsufficientCapacityError` stay quiet.

These are rule-level regressions, not live deployment tests. GitLab histogram emission
and application metrics must be enabled. No producer metrics or bucket boundaries are invented.
