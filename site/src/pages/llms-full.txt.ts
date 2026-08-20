import type { APIRoute } from 'astro';
import { data, getGroupSlug, getServiceSlug, getTotalRuleCount, getTotalServiceCount } from '../data/rules';
import { SITE_NAME, SITE_URL, GITHUB_URL, AUTHOR_NAME, LICENSE_CC_BY_NAME } from '../data/site';

export const GET: APIRoute = () => {
  const totalRules = getTotalRuleCount();
  const totalServices = getTotalServiceCount();
  const siteBase = SITE_URL.replace(/\/$/, '');

  const sections = data.groups
    .map((group) => {
      const groupSlug = getGroupSlug(group);
      const serviceBlocks = group.services
        .map((service) => {
          const serviceSlug = getServiceSlug(service);
          const ruleLines = service.exporters
            .flatMap((exporter) =>
              (exporter.rules ?? []).map((rule) => {
                const forPart = rule.for ? `, for: ${rule.for}` : '';
                return `  - **${rule.name}** (severity: ${rule.severity}${forPart})\n    ${rule.description}`;
              })
            )
            .join('\n');
          return `### [${service.name}](${siteBase}/rules/${groupSlug}/${serviceSlug}/)\n\n${ruleLines}`;
        })
        .join('\n\n');
      return `## ${group.name}\n\n${serviceBlocks}`;
    })
    .join('\n\n');

  const content = `# ${SITE_NAME} — Full Content

> ${totalRules} copy-pasteable Prometheus alerting rules for ${totalServices} monitored services.

## Overview

Awesome Prometheus Alerts is the most comprehensive collection of Prometheus alerting rules. Rules are organized by category and service, with each rule containing:
- Alert name and description explaining what is happening and why it matters
- PromQL expression tested against the latest exporter version
- Severity level: critical (requires immediate attention), warning (needs attention soon), or info (awareness only)
- Duration (for field) to avoid false positives from transient spikes

All rules are copy-paste ready YAML for direct use in Prometheus configuration files.

## Guides

- [AlertManager Configuration](${siteBase}/alertmanager/): Prometheus configuration (scrape_interval, evaluation_interval, rule_files), AlertManager routing with group_wait/group_interval/repeat_interval, Slack and webhook receivers, recorded rules for expensive queries, and troubleshooting notification delays.
- [Blackbox Exporter](${siteBase}/blackbox-exporter/): Deploy worldwide probes for HTTP, HTTPS, DNS, TCP, ICMP monitoring from multiple Points of Presence. Prometheus relabeling config, geohash setup for Grafana geomap panel, community dashboard links.
- [Sleep Peacefully](${siteBase}/sleep-peacefully/): Suppress noisy alerts during nights and weekends using day_of_week(), hour(), month() PromQL functions. Timezone-aware recording rules for Europe/London and Europe/Paris, public holiday suppression patterns.

## All rules by category and service

${sections}

## Source

- GitHub: ${GITHUB_URL}
- Author: ${AUTHOR_NAME}
- License: ${LICENSE_CC_BY_NAME}
`;

  return new Response(content, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
