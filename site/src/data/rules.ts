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

/** Build a redirect map: old anchor slug -> new path (for /rules/ page redirect) */
export function buildRedirectMap(base: string): Record<string, string> {
  const map: Record<string, string> = {};
  for (const { group, service, groupSlug, serviceSlug } of getAllServices()) {
    // Current site uses: service.name | replace: " ", "-" | downcase
    const oldAnchor = service.name.replace(/ /g, '-').toLowerCase();
    map[oldAnchor] = `${base}/rules/${groupSlug}/${serviceSlug}/`;
  }
  return map;
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

/** Build the raw GitHub URL for a dist file */
export function getDistUrl(serviceName: string, exporterSlug: string): string {
  const serviceSlug = serviceName.replace(/ /g, '-').toLowerCase();
  return `https://raw.githubusercontent.com/samber/awesome-prometheus-alerts/refs/heads/master/dist/rules/${serviceSlug}/${exporterSlug}.yml`;
}
