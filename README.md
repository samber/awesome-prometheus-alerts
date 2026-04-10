# 👋 Awesome Prometheus Alerts [![Awesome](https://awesome.re/badge-flat.svg)](https://awesome.re)

> Most alerting rules are common to every Prometheus setup. We need a place to find them all. 🤘 🚨 📊

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

- [Prometheus self-monitoring](https://samber.github.io/awesome-prometheus-alerts/rules#prometheus-internals)
- [Host/Hardware](https://samber.github.io/awesome-prometheus-alerts/rules#host-and-hardware)
- [SMART](https://samber.github.io/awesome-prometheus-alerts/rules#smart)
- [IPMI](https://samber.github.io/awesome-prometheus-alerts/rules#ipmi)
- [Docker Containers](https://samber.github.io/awesome-prometheus-alerts/rules#docker-containers)
- [Blackbox](https://samber.github.io/awesome-prometheus-alerts/rules#blackbox)
- [Windows](https://samber.github.io/awesome-prometheus-alerts/rules#windows-server)
- [VMWare](https://samber.github.io/awesome-prometheus-alerts/rules#vmware)
- [Proxmox VE](https://samber.github.io/awesome-prometheus-alerts/rules#proxmox-ve)
- [Netdata](https://samber.github.io/awesome-prometheus-alerts/rules#netdata)
- [eBPF](https://samber.github.io/awesome-prometheus-alerts/rules#ebpf)
- [Process Exporter](https://samber.github.io/awesome-prometheus-alerts/rules#process-exporter)
- [Systemd](https://samber.github.io/awesome-prometheus-alerts/rules#systemd)

#### Databases

- [MySQL](https://samber.github.io/awesome-prometheus-alerts/rules#mysql)
- [PostgreSQL](https://samber.github.io/awesome-prometheus-alerts/rules#postgresql)
- [SQL Server](https://samber.github.io/awesome-prometheus-alerts/rules#sql-server)
- [Oracle Database](https://samber.github.io/awesome-prometheus-alerts/rules#oracle-database)
- [Patroni](https://samber.github.io/awesome-prometheus-alerts/rules#patroni)
- [PGBouncer](https://samber.github.io/awesome-prometheus-alerts/rules#pgbouncer)
- [Redis](https://samber.github.io/awesome-prometheus-alerts/rules#redis)
- [Memcached](https://samber.github.io/awesome-prometheus-alerts/rules#memcached)
- [MongoDB](https://samber.github.io/awesome-prometheus-alerts/rules#mongodb)
- [Elasticsearch](https://samber.github.io/awesome-prometheus-alerts/rules#elasticsearch)
- [OpenSearch](https://samber.github.io/awesome-prometheus-alerts/rules#opensearch)
- [Meilisearch](https://samber.github.io/awesome-prometheus-alerts/rules#meilisearch)
- [Cassandra](https://samber.github.io/awesome-prometheus-alerts/rules#cassandra)
- [Clickhouse](https://samber.github.io/awesome-prometheus-alerts/rules#clickhouse)
- [CouchDB](https://samber.github.io/awesome-prometheus-alerts/rules#couchdb)
- [Solr](https://samber.github.io/awesome-prometheus-alerts/rules#solr)

#### Message brokers

- [RabbitMQ](https://samber.github.io/awesome-prometheus-alerts/rules#rabbitmq)
- [Zookeeper](https://samber.github.io/awesome-prometheus-alerts/rules#zookeeper)
- [Kafka](https://samber.github.io/awesome-prometheus-alerts/rules#kafka)
- [Pulsar](https://samber.github.io/awesome-prometheus-alerts/rules#pulsar)
- [Nats](https://samber.github.io/awesome-prometheus-alerts/rules#nats)

#### Proxies, load balancers and service meshes

- [Nginx](https://samber.github.io/awesome-prometheus-alerts/rules#nginx)
- [Apache](https://samber.github.io/awesome-prometheus-alerts/rules#apache)
- [HaProxy](https://samber.github.io/awesome-prometheus-alerts/rules#haproxy)
- [Traefik](https://samber.github.io/awesome-prometheus-alerts/rules#traefik)
- [Caddy](https://samber.github.io/awesome-prometheus-alerts/rules#caddy)
- [Envoy](https://samber.github.io/awesome-prometheus-alerts/rules#envoy)
- [Linkerd](https://samber.github.io/awesome-prometheus-alerts/rules#linkerd)
- [Istio](https://samber.github.io/awesome-prometheus-alerts/rules#istio)

#### Runtimes

- [PHP-FPM](https://samber.github.io/awesome-prometheus-alerts/rules#php-fpm)
- [JVM](https://samber.github.io/awesome-prometheus-alerts/rules#jvm)
- [Golang](https://samber.github.io/awesome-prometheus-alerts/rules#golang)
- [Ruby](https://samber.github.io/awesome-prometheus-alerts/rules#ruby)
- [Python](https://samber.github.io/awesome-prometheus-alerts/rules#python)
- [Sidekiq](https://samber.github.io/awesome-prometheus-alerts/rules#sidekiq)

#### Data engineering

- [Apache Flink](https://samber.github.io/awesome-prometheus-alerts/rules#apache-flink)
- [Apache Spark](https://samber.github.io/awesome-prometheus-alerts/rules#apache-spark)
- [Hadoop](https://samber.github.io/awesome-prometheus-alerts/rules#hadoop)

#### Orchestrators

- [Kubernetes](https://samber.github.io/awesome-prometheus-alerts/rules#kubernetes)
- [Nomad](https://samber.github.io/awesome-prometheus-alerts/rules#nomad)
- [Consul](https://samber.github.io/awesome-prometheus-alerts/rules#consul)
- [Etcd](https://samber.github.io/awesome-prometheus-alerts/rules#etcd)
- [OpenStack](https://samber.github.io/awesome-prometheus-alerts/rules#openstack)

#### CI/CD

- [Jenkins](https://samber.github.io/awesome-prometheus-alerts/rules#jenkins)
- [ArgoCD](https://samber.github.io/awesome-prometheus-alerts/rules#argocd)
- [FluxCD](https://samber.github.io/awesome-prometheus-alerts/rules#fluxcd)
- [GitLab CI](https://samber.github.io/awesome-prometheus-alerts/rules#gitlab-ci)
- [Spinnaker](https://samber.github.io/awesome-prometheus-alerts/rules#spinnaker)

#### Network and security

- [SpeedTest](https://samber.github.io/awesome-prometheus-alerts/rules#speedtest)
- [SSL/TLS](https://samber.github.io/awesome-prometheus-alerts/rules#ssl/tls)
- [cert-manager](https://samber.github.io/awesome-prometheus-alerts/rules#cert-manager)
- [Juniper](https://samber.github.io/awesome-prometheus-alerts/rules#juniper)
- [CoreDNS](https://samber.github.io/awesome-prometheus-alerts/rules#coredns)
- [FreeSwitch](https://samber.github.io/awesome-prometheus-alerts/rules#freeswitch)
- [Hashicorp Vault](https://samber.github.io/awesome-prometheus-alerts/rules#hashicorp-vault)
- [Keycloak](https://samber.github.io/awesome-prometheus-alerts/rules#keycloak)
- [Cloudflare](https://samber.github.io/awesome-prometheus-alerts/rules#cloudflare)
- [SNMP](https://samber.github.io/awesome-prometheus-alerts/rules#snmp)
- [Cilium](https://samber.github.io/awesome-prometheus-alerts/rules#cilium)
- [WireGuard](https://samber.github.io/awesome-prometheus-alerts/rules#wireguard)

#### Storage

- [Ceph](https://samber.github.io/awesome-prometheus-alerts/rules#ceph)
- [ZFS](https://samber.github.io/awesome-prometheus-alerts/rules#zfs)
- [OpenEBS](https://samber.github.io/awesome-prometheus-alerts/rules#openebs)
- [Minio](https://samber.github.io/awesome-prometheus-alerts/rules#minio)

#### Cloud providers

- [AWS CloudWatch](https://samber.github.io/awesome-prometheus-alerts/rules#aws-cloudwatch)
- [Google Cloud Stackdriver](https://samber.github.io/awesome-prometheus-alerts/rules#google-cloud-stackdriver)
- [DigitalOcean](https://samber.github.io/awesome-prometheus-alerts/rules#digitalocean)
- [Azure](https://samber.github.io/awesome-prometheus-alerts/rules#azure)

#### Observability

- [Thanos](https://samber.github.io/awesome-prometheus-alerts/rules#thanos)
- [Loki](https://samber.github.io/awesome-prometheus-alerts/rules#loki)
- [Promtail](https://samber.github.io/awesome-prometheus-alerts/rules#promtail)
- [Cortex](https://samber.github.io/awesome-prometheus-alerts/rules#cortex)
- [Grafana Tempo](https://samber.github.io/awesome-prometheus-alerts/rules#grafana-tempo)
- [Grafana Mimir](https://samber.github.io/awesome-prometheus-alerts/rules#grafana-mimir)
- [Grafana Alloy](https://samber.github.io/awesome-prometheus-alerts/rules#grafana-alloy)
- [OpenTelemetry Collector](https://samber.github.io/awesome-prometheus-alerts/rules#opentelemetry-collector)
- [Jaeger](https://samber.github.io/awesome-prometheus-alerts/rules#jaeger)

#### Other

- [APC UPS](https://samber.github.io/awesome-prometheus-alerts/rules#apc-ups)
- [Graph Node](https://samber.github.io/awesome-prometheus-alerts/rules#graph-node)

## 🤝 Contributing

Contributions from community (you!) are most welcome!

There are many ways to contribute: writing code, alerting rules, documentation, reporting issues, discussing better error tracking...

[Instructions here](CONTRIBUTING.md)

## 🏋️ Improvements

- Create an alert rule builder for custom alerts (severity, thresholds, instances...)
- Add resolution suggestions to rule descriptions, for faster incident resolution ([#85](https://github.com/samber/awesome-prometheus-alerts/issues/85)).

## 💫 Show your support

Give a ⭐️ if this project helped you!

[![support us](https://c5.patreon.com/external/logo/become_a_patron_button.png)](https://www.patreon.com/samber)

## 📝 License

[![CC4](https://mirrors.creativecommons.org/presskit/cc.srr.primary.svg)](https://creativecommons.org/licenses/by/4.0/legalcode)

Licensed under the Creative Commons 4.0 License, see LICENSE file for more detail.
