# 👋 Awesome Prometheus Alerts [![Awesome](https://awesome.re/badge-flat.svg)](https://awesome.re)

> **1,155+ production-ready Prometheus alerting rules for 93+ services** — copy-paste YAML for Kubernetes, MySQL, Redis, Kafka, and more.

Collection available here: **[https://samber.github.io/awesome-prometheus-alerts](https://samber.github.io/awesome-prometheus-alerts)**

<div align="center">
  <hr>
  <sup><b>Sponsored by:</b></sup>
  <br>
  <a href="https://cast.ai/samuel">
    <div>
      <img src="https://samber.github.io/awesome-prometheus-alerts/images/sponsor-cast-ai.png" width="200" alt="Cast AI">
    </div>
    <div>
      Cut Kubernetes & AI costs, boost application stability.
    </div>
  </a>
  <br>
  <a href="https://betterstack.com">
    <div>
      <img src="https://samber.github.io/awesome-prometheus-alerts/images/sponsor-betterstack.png" width="200" alt="Better Stack">
    </div>
    <div>
      Better Stack lets you centralize, search, and visualize your logs.
    </div>
  </a>
  <br>
  <a href="https://victoriametrics.com">
    <div>
      <img src="https://samber.github.io/awesome-prometheus-alerts/images/sponsor-victoriametrics.png" width="200" alt="VictoriaMetrics">
    </div>
    <div>
      Fast, open-source time series database and drop-in Prometheus replacement.
    </div>
  </a>
  <hr>
</div>

## ✨ Contents

- [Rules](#-rules)
- [Contributing](#-contributing)
- [Improvements](#-improvements)
- [Help us](#-show-your-support)
- [License](#-license)

## 🚨 Rules

#### Basic resource monitoring

- [Prometheus self-monitoring](https://samber.github.io/awesome-prometheus-alerts/rules/basic-resource-monitoring/prometheus-self-monitoring/)
- [Host and hardware](https://samber.github.io/awesome-prometheus-alerts/rules/basic-resource-monitoring/host-and-hardware/)
- [S.M.A.R.T Device Monitoring](https://samber.github.io/awesome-prometheus-alerts/rules/basic-resource-monitoring/s-m-a-r-t-device-monitoring/)
- [IPMI](https://samber.github.io/awesome-prometheus-alerts/rules/basic-resource-monitoring/ipmi/)
- [Docker containers](https://samber.github.io/awesome-prometheus-alerts/rules/basic-resource-monitoring/docker-containers/)
- [Blackbox](https://samber.github.io/awesome-prometheus-alerts/rules/basic-resource-monitoring/blackbox/)
- [Windows Server](https://samber.github.io/awesome-prometheus-alerts/rules/basic-resource-monitoring/windows-server/)
- [VMware](https://samber.github.io/awesome-prometheus-alerts/rules/basic-resource-monitoring/vmware/)
- [Proxmox VE](https://samber.github.io/awesome-prometheus-alerts/rules/basic-resource-monitoring/proxmox-ve/)
- [Netdata](https://samber.github.io/awesome-prometheus-alerts/rules/basic-resource-monitoring/netdata/)
- [eBPF](https://samber.github.io/awesome-prometheus-alerts/rules/basic-resource-monitoring/ebpf/)
- [Process Exporter](https://samber.github.io/awesome-prometheus-alerts/rules/basic-resource-monitoring/process-exporter/)
- [Systemd](https://samber.github.io/awesome-prometheus-alerts/rules/basic-resource-monitoring/systemd/)

#### Databases

- [MySQL](https://samber.github.io/awesome-prometheus-alerts/rules/databases/mysql/)
- [PostgreSQL](https://samber.github.io/awesome-prometheus-alerts/rules/databases/postgresql/)
- [SQL Server](https://samber.github.io/awesome-prometheus-alerts/rules/databases/sql-server/)
- [Oracle Database](https://samber.github.io/awesome-prometheus-alerts/rules/databases/oracle-database/)
- [Patroni](https://samber.github.io/awesome-prometheus-alerts/rules/databases/patroni/)
- [PGBouncer](https://samber.github.io/awesome-prometheus-alerts/rules/databases/pgbouncer/)
- [Redis](https://samber.github.io/awesome-prometheus-alerts/rules/databases/redis/)
- [Memcached](https://samber.github.io/awesome-prometheus-alerts/rules/databases/memcached/)
- [MongoDB](https://samber.github.io/awesome-prometheus-alerts/rules/databases/mongodb/)
- [Elasticsearch](https://samber.github.io/awesome-prometheus-alerts/rules/databases/elasticsearch/)
- [OpenSearch](https://samber.github.io/awesome-prometheus-alerts/rules/databases/opensearch/)
- [Meilisearch](https://samber.github.io/awesome-prometheus-alerts/rules/databases/meilisearch/)
- [Cassandra](https://samber.github.io/awesome-prometheus-alerts/rules/databases/cassandra/)
- [Clickhouse](https://samber.github.io/awesome-prometheus-alerts/rules/databases/clickhouse/)
- [CouchDB](https://samber.github.io/awesome-prometheus-alerts/rules/databases/couchdb/)
- [Solr](https://samber.github.io/awesome-prometheus-alerts/rules/databases/solr/)

#### Message brokers

- [RabbitMQ](https://samber.github.io/awesome-prometheus-alerts/rules/message-brokers/rabbitmq/)
- [Zookeeper](https://samber.github.io/awesome-prometheus-alerts/rules/message-brokers/zookeeper/)
- [Kafka](https://samber.github.io/awesome-prometheus-alerts/rules/message-brokers/kafka/)
- [Pulsar](https://samber.github.io/awesome-prometheus-alerts/rules/message-brokers/pulsar/)
- [Nats](https://samber.github.io/awesome-prometheus-alerts/rules/message-brokers/nats/)

#### Proxies, load balancers and service meshes

- [Nginx](https://samber.github.io/awesome-prometheus-alerts/rules/proxies-load-balancers-and-service-meshes/nginx/)
- [Apache](https://samber.github.io/awesome-prometheus-alerts/rules/proxies-load-balancers-and-service-meshes/apache/)
- [HaProxy](https://samber.github.io/awesome-prometheus-alerts/rules/proxies-load-balancers-and-service-meshes/haproxy/)
- [Traefik](https://samber.github.io/awesome-prometheus-alerts/rules/proxies-load-balancers-and-service-meshes/traefik/)
- [Caddy](https://samber.github.io/awesome-prometheus-alerts/rules/proxies-load-balancers-and-service-meshes/caddy/)
- [Envoy](https://samber.github.io/awesome-prometheus-alerts/rules/proxies-load-balancers-and-service-meshes/envoy/)
- [Linkerd](https://samber.github.io/awesome-prometheus-alerts/rules/proxies-load-balancers-and-service-meshes/linkerd/)
- [Istio](https://samber.github.io/awesome-prometheus-alerts/rules/proxies-load-balancers-and-service-meshes/istio/)

#### Runtimes

- [PHP-FPM](https://samber.github.io/awesome-prometheus-alerts/rules/runtimes/php-fpm/)
- [JVM](https://samber.github.io/awesome-prometheus-alerts/rules/runtimes/jvm/)
- [Golang](https://samber.github.io/awesome-prometheus-alerts/rules/runtimes/golang/)
- [Ruby](https://samber.github.io/awesome-prometheus-alerts/rules/runtimes/ruby/)
- [Python](https://samber.github.io/awesome-prometheus-alerts/rules/runtimes/python/)
- [Sidekiq](https://samber.github.io/awesome-prometheus-alerts/rules/runtimes/sidekiq/)

#### Data engineering

- [Apache Flink](https://samber.github.io/awesome-prometheus-alerts/rules/data-engineering/apache-flink/)
- [Apache Spark](https://samber.github.io/awesome-prometheus-alerts/rules/data-engineering/apache-spark/)
- [Hadoop](https://samber.github.io/awesome-prometheus-alerts/rules/data-engineering/hadoop/)

#### Orchestrators

- [Kubernetes](https://samber.github.io/awesome-prometheus-alerts/rules/orchestrators/kubernetes/)
- [Nomad](https://samber.github.io/awesome-prometheus-alerts/rules/orchestrators/nomad/)
- [Consul](https://samber.github.io/awesome-prometheus-alerts/rules/orchestrators/consul/)
- [Etcd](https://samber.github.io/awesome-prometheus-alerts/rules/orchestrators/etcd/)
- [OpenStack](https://samber.github.io/awesome-prometheus-alerts/rules/orchestrators/openstack/)

#### CI/CD

- [Jenkins](https://samber.github.io/awesome-prometheus-alerts/rules/ci-cd/jenkins/)
- [ArgoCD](https://samber.github.io/awesome-prometheus-alerts/rules/ci-cd/argocd/)
- [FluxCD](https://samber.github.io/awesome-prometheus-alerts/rules/ci-cd/fluxcd/)
- [GitLab CI](https://samber.github.io/awesome-prometheus-alerts/rules/ci-cd/gitlab-ci/)
- [Spinnaker](https://samber.github.io/awesome-prometheus-alerts/rules/ci-cd/spinnaker/)

#### Network and security

- [SpeedTest](https://samber.github.io/awesome-prometheus-alerts/rules/network-and-security/speedtest/)
- [SSL/TLS](https://samber.github.io/awesome-prometheus-alerts/rules/network-and-security/ssl-tls/)
- [cert-manager](https://samber.github.io/awesome-prometheus-alerts/rules/network-and-security/cert-manager/)
- [Juniper](https://samber.github.io/awesome-prometheus-alerts/rules/network-and-security/juniper/)
- [CoreDNS](https://samber.github.io/awesome-prometheus-alerts/rules/network-and-security/coredns/)
- [Freeswitch](https://samber.github.io/awesome-prometheus-alerts/rules/network-and-security/freeswitch/)
- [Hashicorp Vault](https://samber.github.io/awesome-prometheus-alerts/rules/network-and-security/hashicorp-vault/)
- [Keycloak](https://samber.github.io/awesome-prometheus-alerts/rules/network-and-security/keycloak/)
- [Cloudflare](https://samber.github.io/awesome-prometheus-alerts/rules/network-and-security/cloudflare/)
- [SNMP](https://samber.github.io/awesome-prometheus-alerts/rules/network-and-security/snmp/)
- [Cilium](https://samber.github.io/awesome-prometheus-alerts/rules/network-and-security/cilium/)
- [WireGuard](https://samber.github.io/awesome-prometheus-alerts/rules/network-and-security/wireguard/)

#### Storage

- [Ceph](https://samber.github.io/awesome-prometheus-alerts/rules/storage/ceph/)
- [ZFS](https://samber.github.io/awesome-prometheus-alerts/rules/storage/zfs/)
- [OpenEBS](https://samber.github.io/awesome-prometheus-alerts/rules/storage/openebs/)
- [Minio](https://samber.github.io/awesome-prometheus-alerts/rules/storage/minio/)

#### Cloud providers

- [AWS CloudWatch](https://samber.github.io/awesome-prometheus-alerts/rules/cloud-providers/aws-cloudwatch/)
- [Google Cloud Stackdriver](https://samber.github.io/awesome-prometheus-alerts/rules/cloud-providers/google-cloud-stackdriver/)
- [DigitalOcean](https://samber.github.io/awesome-prometheus-alerts/rules/cloud-providers/digitalocean/)
- [Azure](https://samber.github.io/awesome-prometheus-alerts/rules/cloud-providers/azure/)

#### Observability

- [Thanos](https://samber.github.io/awesome-prometheus-alerts/rules/observability/thanos/)
- [Loki](https://samber.github.io/awesome-prometheus-alerts/rules/observability/loki/)
- [Promtail](https://samber.github.io/awesome-prometheus-alerts/rules/observability/promtail/)
- [Cortex](https://samber.github.io/awesome-prometheus-alerts/rules/observability/cortex/)
- [Grafana Tempo](https://samber.github.io/awesome-prometheus-alerts/rules/observability/grafana-tempo/)
- [Grafana Mimir](https://samber.github.io/awesome-prometheus-alerts/rules/observability/grafana-mimir/)
- [Grafana Alloy](https://samber.github.io/awesome-prometheus-alerts/rules/observability/grafana-alloy/)
- [OpenTelemetry Collector](https://samber.github.io/awesome-prometheus-alerts/rules/observability/opentelemetry-collector/)
- [Jaeger](https://samber.github.io/awesome-prometheus-alerts/rules/observability/jaeger/)

#### Other

- [APC UPS](https://samber.github.io/awesome-prometheus-alerts/rules/other/apc-ups/)
- [Graph Node](https://samber.github.io/awesome-prometheus-alerts/rules/other/graph-node/)
- [LiteLLM](https://samber.github.io/awesome-prometheus-alerts/rules/other/litellm/)

## 🤝 Contributing

Contributions from community (you!) are most welcome!

There are many ways to contribute: writing code, alerting rules, documentation, reporting issues, discussing better error tracking...

[Instructions here](CONTRIBUTING.md)

## 💫 Show your support

Give a ⭐️ if this project helped you!

[![support us](https://c5.patreon.com/external/logo/become_a_patron_button.png)](https://www.patreon.com/samber)

## 📝 License

- Alert rules and content: [Creative Commons CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- Site source code: [MIT](site/LICENSE)

See [LICENSE](LICENSE) for details.
