import type { APIRoute } from 'astro';
import { data, getGroupSlug, getServiceSlug, getDistUrl, getTotalRuleCount, getTotalServiceCount } from '../data/rules';
import { SITE_NAME, SITE_URL, GITHUB_URL, AUTHOR_NAME, LICENSE_CC_BY_NAME } from '../data/site';

export const GET: APIRoute = () => {
  const totalRules = getTotalRuleCount();
  const totalServices = getTotalServiceCount();
  const siteBase = SITE_URL.replace(/\/$/, '');

  const categoryList = data.groups
    .map((group) => {
      const services = group.services.map((s) => s.name).join(', ');
      return `- **${group.name}**: ${services}`;
    })
    .join('\n');

  const distTree = data.groups
    .map((group) => {
      const groupSlug = getGroupSlug(group);
      const serviceLines = group.services
        .map((service) => {
          const serviceSlug = getServiceSlug(service);
          const exporterLines = service.exporters
            .map((exporter) => {
              const url = getDistUrl(service.name, exporter.slug);
              const label = exporter.name ? `${exporter.name} (${exporter.slug})` : exporter.slug;
              return `    - [${label}](${url})`;
            })
            .join('\n');
          return `  - [${service.name}](${siteBase}/rules/${groupSlug}/${serviceSlug}/)\n${exporterLines}`;
        })
        .join('\n');
      return `- **${group.name}**\n${serviceLines}`;
    })
    .join('\n');

  const content = `# ${SITE_NAME}

> ${totalRules}+ copy-pasteable Prometheus alerting rules for ${totalServices}+ monitored services. The definitive open-source collection for Prometheus monitoring, covering databases, Kubernetes, cloud providers, message brokers, and more.

## Key pages

- [Alert rules catalog](${siteBase}/rules/): Browse all ${totalRules} alerting rules organized by category and service
- [AlertManager configuration guide](${siteBase}/alertmanager/): Prometheus and AlertManager configuration examples, recorded rules, and troubleshooting
- [Blackbox Exporter guide](${siteBase}/blackbox-exporter/): Worldwide endpoint probing over HTTP, HTTPS, DNS, TCP, and ICMP with Grafana maps
- [Sleep Peacefully guide](${siteBase}/sleep-peacefully/): Time-based alert suppression and timezone-aware PromQL patterns

## Categories and services

${categoryList}

## Downloadable Rule Files

${distTree}

## Full Content

- [llms-full.txt](${siteBase}/llms-full.txt): Complete list of all alert rules with title, description and severity

## About

${SITE_NAME} is a community-driven open-source project maintained by ${AUTHOR_NAME}.
Source: ${GITHUB_URL}
License: ${LICENSE_CC_BY_NAME}
`;

  return new Response(content, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
