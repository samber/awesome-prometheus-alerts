// @ts-ignore — Vite YAML plugin provides this at build time
import rulesData from '../../../_data/rules.yml';

export interface Rule {
  name: string;
  description: string;
  query: string;
  severity: 'critical' | 'warning' | 'info';
  for?: string;
  comments?: string;
}

export interface Exporter {
  slug: string;
  name?: string;
  doc_url?: string;
  comments?: string;
  rules: Rule[];
}

export interface Service {
  name: string;
  exporters: Exporter[];
}

export interface Group {
  name: string;
  services: Service[];
}

export interface RulesData {
  groups: Group[];
}

export const data: RulesData = rulesData as RulesData;

/** Slugify a name for use in URLs — mirrors the dist/ workflow naming */
export function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function getGroupSlug(group: Group): string {
  return toSlug(group.name);
}

export function getServiceSlug(service: Service): string {
  return toSlug(service.name);
}

/** CamelCase a rule name for the Prometheus alert name field */
export function toCamelCase(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
}

/** Count all rules across a service's exporters */
export function getRuleCount(service: Service): number {
  return service.exporters.reduce((sum, exp) => sum + (exp.rules?.length ?? 0), 0);
}

/** Count all rules in the entire dataset */
export function getTotalRuleCount(): number {
  return data.groups.reduce(
    (sum, group) => sum + group.services.reduce((s, svc) => s + getRuleCount(svc), 0),
    0
  );
}

/** Count all services */
export function getTotalServiceCount(): number {
  return data.groups.reduce((sum, group) => sum + group.services.length, 0);
}

/** Count all exporters */
export function getTotalExporterCount(): number {
  return data.groups.reduce(
    (sum, group) =>
      sum + group.services.reduce((s, svc) => s + svc.exporters.length, 0),
    0
  );
}

/** Flat list of all services with routing context */
export function getAllServices(): Array<{
  group: Group;
  service: Service;
  groupSlug: string;
  serviceSlug: string;
  ruleCount: number;
}> {
  return data.groups.flatMap((group) =>
    group.services.map((service) => ({
      group,
      service,
      groupSlug: getGroupSlug(group),
      serviceSlug: getServiceSlug(service),
      ruleCount: getRuleCount(service),
    }))
  );
}

/** Hard-coded map from old Jekyll anchor IDs to new Astro paths.
 *
 * Old Jekyll site pattern (spaces→hyphens, lowercased; dots/slashes preserved):
 *   - #service-name          → service section heading
 *   - #service-name-1        → first exporter subsection
 *   - #service-name-2        → second exporter subsection, …
 *
 * New Astro paths use /rules/{group}/{service}/#exporter-{slug} for exporter sections.
 */
const ANCHOR_REDIRECT_MAP: Record<string, string> = {
  // Basic resource monitoring
  'prometheus-self-monitoring': '/rules/basic-resource-monitoring/prometheus-self-monitoring/',
  'prometheus-self-monitoring-1': '/rules/basic-resource-monitoring/prometheus-self-monitoring/#exporter-embedded-exporter',
  'host-and-hardware': '/rules/basic-resource-monitoring/host-and-hardware/',
  'host-and-hardware-1': '/rules/basic-resource-monitoring/host-and-hardware/#exporter-node-exporter',
  's.m.a.r.t-device-monitoring': '/rules/basic-resource-monitoring/s-m-a-r-t-device-monitoring/',
  's.m.a.r.t-device-monitoring-1': '/rules/basic-resource-monitoring/s-m-a-r-t-device-monitoring/#exporter-smartctl-exporter',
  'ipmi': '/rules/basic-resource-monitoring/ipmi/',
  'ipmi-1': '/rules/basic-resource-monitoring/ipmi/#exporter-ipmi-exporter',
  'docker-containers': '/rules/basic-resource-monitoring/docker-containers/',
  'docker-containers-1': '/rules/basic-resource-monitoring/docker-containers/#exporter-google-cadvisor',
  'blackbox': '/rules/basic-resource-monitoring/blackbox/',
  'blackbox-1': '/rules/basic-resource-monitoring/blackbox/#exporter-blackbox-exporter',
  'windows-server': '/rules/basic-resource-monitoring/windows-server/',
  'windows-server-1': '/rules/basic-resource-monitoring/windows-server/#exporter-windows-exporter',
  'vmware': '/rules/basic-resource-monitoring/vmware/',
  'vmware-1': '/rules/basic-resource-monitoring/vmware/#exporter-pryorda-vmware-exporter',
  'proxmox-ve': '/rules/basic-resource-monitoring/proxmox-ve/',
  'proxmox-ve-1': '/rules/basic-resource-monitoring/proxmox-ve/#exporter-prometheus-pve-exporter',
  'netdata': '/rules/basic-resource-monitoring/netdata/',
  'netdata-1': '/rules/basic-resource-monitoring/netdata/#exporter-embedded-exporter',
  'ebpf': '/rules/basic-resource-monitoring/ebpf/',
  'ebpf-1': '/rules/basic-resource-monitoring/ebpf/#exporter-ebpf-exporter',
  'process-exporter': '/rules/basic-resource-monitoring/process-exporter/',
  'process-exporter-1': '/rules/basic-resource-monitoring/process-exporter/#exporter-process-exporter',
  'systemd': '/rules/basic-resource-monitoring/systemd/',
  'systemd-1': '/rules/basic-resource-monitoring/systemd/#exporter-systemd-exporter',

  // Databases
  'mysql': '/rules/databases/mysql/',
  'mysql-1': '/rules/databases/mysql/#exporter-mysqld-exporter',
  'postgresql': '/rules/databases/postgresql/',
  'postgresql-1': '/rules/databases/postgresql/#exporter-postgres-exporter',
  'sql-server': '/rules/databases/sql-server/',
  'sql-server-1': '/rules/databases/sql-server/#exporter-ozarklake-mssql-exporter',
  'oracle-database': '/rules/databases/oracle-database/',
  'oracle-database-1': '/rules/databases/oracle-database/#exporter-iamseth-oracledb-exporter',
  'patroni': '/rules/databases/patroni/',
  'patroni-1': '/rules/databases/patroni/#exporter-embedded-exporter-patroni',
  'pgbouncer': '/rules/databases/pgbouncer/',
  'pgbouncer-1': '/rules/databases/pgbouncer/#exporter-spreaker-pgbouncer-exporter',
  'redis': '/rules/databases/redis/',
  'redis-1': '/rules/databases/redis/#exporter-oliver006-redis-exporter',
  'memcached': '/rules/databases/memcached/',
  'memcached-1': '/rules/databases/memcached/#exporter-memcached-exporter',
  'mongodb': '/rules/databases/mongodb/',
  'mongodb-1': '/rules/databases/mongodb/#exporter-percona-mongodb-exporter',
  'mongodb-2': '/rules/databases/mongodb/#exporter-dcu-mongodb-exporter',
  'mongodb-3': '/rules/databases/mongodb/#exporter-stefanprodan-mgob-exporter',
  'elasticsearch': '/rules/databases/elasticsearch/',
  'elasticsearch-1': '/rules/databases/elasticsearch/#exporter-prometheus-community-elasticsearch-exporter',
  'opensearch': '/rules/databases/opensearch/',
  'opensearch-1': '/rules/databases/opensearch/#exporter-opensearch-project-opensearch-prometheus-exporter',
  'meilisearch': '/rules/databases/meilisearch/',
  'meilisearch-1': '/rules/databases/meilisearch/#exporter-embedded-exporter',
  'cassandra': '/rules/databases/cassandra/',
  'cassandra-1': '/rules/databases/cassandra/#exporter-instaclustr-cassandra-exporter',
  'cassandra-2': '/rules/databases/cassandra/#exporter-criteo-cassandra-exporter',
  'clickhouse': '/rules/databases/clickhouse/',
  'clickhouse-1': '/rules/databases/clickhouse/#exporter-embedded-exporter',
  'couchdb': '/rules/databases/couchdb/',
  'couchdb-1': '/rules/databases/couchdb/#exporter-gesellix-couchdb-prometheus-exporter',
  'solr': '/rules/databases/solr/',
  'solr-1': '/rules/databases/solr/#exporter-embedded-exporter',

  // Message brokers
  'rabbitmq': '/rules/message-brokers/rabbitmq/',
  'rabbitmq-1': '/rules/message-brokers/rabbitmq/#exporter-rabbitmq-exporter',
  'rabbitmq-2': '/rules/message-brokers/rabbitmq/#exporter-kbudde-rabbitmq-exporter',
  'zookeeper': '/rules/message-brokers/zookeeper/',
  'zookeeper-1': '/rules/message-brokers/zookeeper/#exporter-cloudflare-kafka-zookeeper-exporter',
  'zookeeper-2': '/rules/message-brokers/zookeeper/#exporter-dabealu-zookeeper-exporter',
  'kafka': '/rules/message-brokers/kafka/',
  'kafka-1': '/rules/message-brokers/kafka/#exporter-danielqsj-kafka-exporter',
  'kafka-2': '/rules/message-brokers/kafka/#exporter-linkedin-kafka-exporter',
  'pulsar': '/rules/message-brokers/pulsar/',
  'pulsar-1': '/rules/message-brokers/pulsar/#exporter-embedded-exporter',
  'nats': '/rules/message-brokers/nats/',
  'nats-1': '/rules/message-brokers/nats/#exporter-nats-exporter',

  // Proxies, load balancers and service meshes
  'nginx': '/rules/proxies-load-balancers-and-service-meshes/nginx/',
  'nginx-1': '/rules/proxies-load-balancers-and-service-meshes/nginx/#exporter-knyar-nginx-exporter',
  'apache': '/rules/proxies-load-balancers-and-service-meshes/apache/',
  'apache-1': '/rules/proxies-load-balancers-and-service-meshes/apache/#exporter-lusitaniae-apache-exporter',
  'haproxy': '/rules/proxies-load-balancers-and-service-meshes/haproxy/',
  'haproxy-1': '/rules/proxies-load-balancers-and-service-meshes/haproxy/#exporter-embedded-exporter-v2',
  'haproxy-2': '/rules/proxies-load-balancers-and-service-meshes/haproxy/#exporter-haproxy-exporter-v1',
  'traefik': '/rules/proxies-load-balancers-and-service-meshes/traefik/',
  'traefik-1': '/rules/proxies-load-balancers-and-service-meshes/traefik/#exporter-embedded-exporter-v2',
  'traefik-2': '/rules/proxies-load-balancers-and-service-meshes/traefik/#exporter-embedded-exporter-v1',
  'caddy': '/rules/proxies-load-balancers-and-service-meshes/caddy/',
  'caddy-1': '/rules/proxies-load-balancers-and-service-meshes/caddy/#exporter-embedded-exporter',
  'envoy': '/rules/proxies-load-balancers-and-service-meshes/envoy/',
  'envoy-1': '/rules/proxies-load-balancers-and-service-meshes/envoy/#exporter-embedded-exporter',
  'linkerd': '/rules/proxies-load-balancers-and-service-meshes/linkerd/',
  'linkerd-1': '/rules/proxies-load-balancers-and-service-meshes/linkerd/#exporter-embedded-exporter',
  'istio': '/rules/proxies-load-balancers-and-service-meshes/istio/',
  'istio-1': '/rules/proxies-load-balancers-and-service-meshes/istio/#exporter-embedded-exporter',

  // Runtimes
  'php-fpm': '/rules/runtimes/php-fpm/',
  'php-fpm-1': '/rules/runtimes/php-fpm/#exporter-bakins-fpm-exporter',
  'jvm': '/rules/runtimes/jvm/',
  'jvm-1': '/rules/runtimes/jvm/#exporter-jvm-exporter',
  'golang': '/rules/runtimes/golang/',
  'golang-1': '/rules/runtimes/golang/#exporter-golang-exporter',
  'ruby': '/rules/runtimes/ruby/',
  'ruby-1': '/rules/runtimes/ruby/#exporter-ruby-exporter',
  'python': '/rules/runtimes/python/',
  'python-1': '/rules/runtimes/python/#exporter-python-exporter',
  'sidekiq': '/rules/runtimes/sidekiq/',
  'sidekiq-1': '/rules/runtimes/sidekiq/#exporter-strech-sidekiq-exporter',

  // Data engineering
  'apache-flink': '/rules/data-engineering/apache-flink/',
  'apache-flink-1': '/rules/data-engineering/apache-flink/#exporter-flink-prometheus-reporter',
  'apache-spark': '/rules/data-engineering/apache-spark/',
  'apache-spark-1': '/rules/data-engineering/apache-spark/#exporter-spark-prometheus',
  'hadoop': '/rules/data-engineering/hadoop/',
  'hadoop-1': '/rules/data-engineering/hadoop/#exporter-jmx_exporter',

  // Orchestrators
  'kubernetes': '/rules/orchestrators/kubernetes/',
  'kubernetes-1': '/rules/orchestrators/kubernetes/#exporter-kubestate-exporter',
  'nomad': '/rules/orchestrators/nomad/',
  'nomad-1': '/rules/orchestrators/nomad/#exporter-embedded-exporter',
  'consul': '/rules/orchestrators/consul/',
  'consul-1': '/rules/orchestrators/consul/#exporter-consul-exporter',
  'etcd': '/rules/orchestrators/etcd/',
  'etcd-1': '/rules/orchestrators/etcd/#exporter-embedded-exporter',
  'openstack': '/rules/orchestrators/openstack/',
  'openstack-1': '/rules/orchestrators/openstack/#exporter-openstack-exporter',

  // CI/CD
  'jenkins': '/rules/ci-cd/jenkins/',
  'jenkins-1': '/rules/ci-cd/jenkins/#exporter-metric-plugin',
  'argocd': '/rules/ci-cd/argocd/',
  'argocd-1': '/rules/ci-cd/argocd/#exporter-embedded-exporter',
  'fluxcd': '/rules/ci-cd/fluxcd/',
  'fluxcd-1': '/rules/ci-cd/fluxcd/#exporter-embedded-exporter',
  'gitlab-ci': '/rules/ci-cd/gitlab-ci/',
  'gitlab-ci-1': '/rules/ci-cd/gitlab-ci/#exporter-gitlab-built-in-exporter',
  'gitlab-ci-2': '/rules/ci-cd/gitlab-ci/#exporter-workhorse',
  'gitlab-ci-3': '/rules/ci-cd/gitlab-ci/#exporter-gitaly',
  'spinnaker': '/rules/ci-cd/spinnaker/',
  'spinnaker-1': '/rules/ci-cd/spinnaker/#exporter-embedded-exporter',

  // Network and security
  'speedtest': '/rules/network-and-security/speedtest/',
  'speedtest-1': '/rules/network-and-security/speedtest/#exporter-nlamirault-speedtest-exporter',
  'ssl/tls': '/rules/network-and-security/ssl-tls/',
  'ssl/tls-1': '/rules/network-and-security/ssl-tls/#exporter-ribbybibby-ssl-exporter',
  'cert-manager': '/rules/network-and-security/cert-manager/',
  'cert-manager-1': '/rules/network-and-security/cert-manager/#exporter-embedded-exporter',
  'juniper': '/rules/network-and-security/juniper/',
  'juniper-1': '/rules/network-and-security/juniper/#exporter-czerwonk-junos-exporter',
  'coredns': '/rules/network-and-security/coredns/',
  'coredns-1': '/rules/network-and-security/coredns/#exporter-embedded-exporter',
  'freeswitch': '/rules/network-and-security/freeswitch/',
  'freeswitch-1': '/rules/network-and-security/freeswitch/#exporter-znerol-freeswitch-exporter',
  'hashicorp-vault': '/rules/network-and-security/hashicorp-vault/',
  'hashicorp-vault-1': '/rules/network-and-security/hashicorp-vault/#exporter-embedded-exporter',
  'keycloak': '/rules/network-and-security/keycloak/',
  'keycloak-1': '/rules/network-and-security/keycloak/#exporter-aerogear-keycloak-metrics-spi',
  'cloudflare': '/rules/network-and-security/cloudflare/',
  'cloudflare-1': '/rules/network-and-security/cloudflare/#exporter-lablabs-cloudflare-exporter',
  'snmp': '/rules/network-and-security/snmp/',
  'snmp-1': '/rules/network-and-security/snmp/#exporter-snmp-exporter',
  'cilium': '/rules/network-and-security/cilium/',
  'cilium-1': '/rules/network-and-security/cilium/#exporter-embedded-exporter',
  'wireguard': '/rules/network-and-security/wireguard/',
  'wireguard-1': '/rules/network-and-security/wireguard/#exporter-mindflavor-prometheus-wireguard-exporter',

  // Storage
  'ceph': '/rules/storage/ceph/',
  'ceph-1': '/rules/storage/ceph/#exporter-embedded-exporter',
  'zfs': '/rules/storage/zfs/',
  'zfs-1': '/rules/storage/zfs/#exporter-node-exporter',
  'zfs-2': '/rules/storage/zfs/#exporter-zfs_exporter',
  'openebs': '/rules/storage/openebs/',
  'openebs-1': '/rules/storage/openebs/#exporter-embedded-exporter',
  'minio': '/rules/storage/minio/',
  'minio-1': '/rules/storage/minio/#exporter-embedded-exporter',

  // Cloud providers
  'aws-cloudwatch': '/rules/cloud-providers/aws-cloudwatch/',
  'aws-cloudwatch-1': '/rules/cloud-providers/aws-cloudwatch/#exporter-prometheus-cloudwatch-exporter',
  'google-cloud-stackdriver': '/rules/cloud-providers/google-cloud-stackdriver/',
  'google-cloud-stackdriver-1': '/rules/cloud-providers/google-cloud-stackdriver/#exporter-stackdriver-exporter',
  'digitalocean': '/rules/cloud-providers/digitalocean/',
  'digitalocean-1': '/rules/cloud-providers/digitalocean/#exporter-digitalocean-exporter',
  'azure': '/rules/cloud-providers/azure/',
  'azure-1': '/rules/cloud-providers/azure/#exporter-azure-metrics-exporter',

  // Observability
  'thanos': '/rules/observability/thanos/',
  'thanos-1': '/rules/observability/thanos/#exporter-thanos-compactor',
  'thanos-2': '/rules/observability/thanos/#exporter-thanos-query',
  'thanos-3': '/rules/observability/thanos/#exporter-thanos-receiver',
  'thanos-4': '/rules/observability/thanos/#exporter-thanos-sidecar',
  'thanos-5': '/rules/observability/thanos/#exporter-thanos-store',
  'thanos-6': '/rules/observability/thanos/#exporter-thanos-ruler',
  'thanos-7': '/rules/observability/thanos/#exporter-thanos-bucket-replicate',
  'thanos-8': '/rules/observability/thanos/#exporter-thanos-component-absent',
  'loki': '/rules/observability/loki/',
  'loki-1': '/rules/observability/loki/#exporter-embedded-exporter',
  'promtail': '/rules/observability/promtail/',
  'promtail-1': '/rules/observability/promtail/#exporter-embedded-exporter',
  'cortex': '/rules/observability/cortex/',
  'cortex-1': '/rules/observability/cortex/#exporter-embedded-exporter',
  'grafana-tempo': '/rules/observability/grafana-tempo/',
  'grafana-tempo-1': '/rules/observability/grafana-tempo/#exporter-embedded-exporter',
  'grafana-mimir': '/rules/observability/grafana-mimir/',
  'grafana-mimir-1': '/rules/observability/grafana-mimir/#exporter-embedded-exporter',
  'grafana-alloy': '/rules/observability/grafana-alloy/',
  'grafana-alloy-1': '/rules/observability/grafana-alloy/#exporter-embedded-exporter',
  'opentelemetry-collector': '/rules/observability/opentelemetry-collector/',
  'opentelemetry-collector-1': '/rules/observability/opentelemetry-collector/#exporter-embedded-exporter',
  'jaeger': '/rules/observability/jaeger/',
  'jaeger-1': '/rules/observability/jaeger/#exporter-embedded-exporter',

  // Other
  'apc-ups': '/rules/other/apc-ups/',
  'apc-ups-1': '/rules/other/apc-ups/#exporter-apcupsd_exporter',
  'graph-node': '/rules/other/graph-node/',
  'graph-node-1': '/rules/other/graph-node/#exporter-embedded-exporter',
};

export function buildRedirectMap(base: string): Record<string, string> {
  return Object.fromEntries(
    Object.entries(ANCHOR_REDIRECT_MAP).map(([anchor, path]) => [anchor, `${base}${path}`])
  );
}

/** Format a rule as copy-pasteable Prometheus alert YAML */
export function formatRuleAsYaml(rule: Rule): string {
  const alertName = toCamelCase(rule.name);
  const forValue = rule.for ?? '0m';

  const commentLines = rule.comments
    ? rule.comments
        .trim()
        .split('\n')
        .map((line) => `  # ${line.trim()}`)
        .join('\n') + '\n'
    : '';

  // Escape double quotes in description
  const description = rule.description.replace(/"/g, '\\"');

  return `${commentLines}- alert: ${alertName}
  expr: ${rule.query}
  for: ${forValue}
  labels:
    severity: ${rule.severity}
  annotations:
    summary: ${rule.name} (instance {{ $labels.instance }})
    description: "${description}\\n  VALUE = {{ $value }}\\n  LABELS = {{ $labels }}"`;
}

/** Format all rules for an exporter as a complete groups YAML block */
export function formatExporterAsYaml(exporter: Exporter): string {
  const groupName = toCamelCase(exporter.slug.replace(/-/g, ' '));
  const rulesYaml = (exporter.rules ?? [])
    .map((rule) => formatRuleAsYaml(rule))
    .join('\n\n');

  return `groups:
- name: ${groupName}
  rules:
${rulesYaml
  .split('\n')
  .map((line) => `    ${line}`)
  .join('\n')}`;
}

/** Ordered list of popular service name fragments (case-insensitive substring match) */
export const popularServiceNames: string[] = [
  'prometheus self-monitoring',
  'host and hardware',
  'kubernetes',
  'mysql',
  'postgresql',
  'redis',
  'mongodb',
  'elasticsearch',
  'rabbitmq',
  'nginx',
  'kafka',
  'docker',
];

/** Returns the ordered list of popular services resolved from the data */
export function getPopularServices() {
  const all = getAllServices();
  return popularServiceNames
    .map((target) => all.find(({ service }) => service.name.toLowerCase().includes(target)))
    .filter((s): s is NonNullable<typeof s> => s !== undefined);
}

/** Flat list of all exporters with their parent group/service context */
export function getAllExporters(): Array<{
  group: Group;
  service: Service;
  exporter: Exporter;
  groupSlug: string;
  serviceSlug: string;
}> {
  return data.groups.flatMap((group) =>
    group.services.flatMap((service) =>
      service.exporters.map((exporter) => ({
        group,
        service,
        exporter,
        groupSlug: getGroupSlug(group),
        serviceSlug: getServiceSlug(service),
      }))
    )
  );
}

/** Build the raw GitHub URL for a dist file */
export function getDistUrl(serviceName: string, exporterSlug: string): string {
  const serviceSlug = serviceName.replace(/ /g, '-').toLowerCase();
  return `https://raw.githubusercontent.com/samber/awesome-prometheus-alerts/refs/heads/master/dist/rules/${serviceSlug}/${exporterSlug}.yml`;
}
