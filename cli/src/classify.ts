import { parseAllDocuments, type Document } from 'yaml';

export type RuleFormat = 'prometheus' | 'prometheus-rule-crd';

export type Classification =
  | {
      kind: 'rules';
      /** Content to upload: the original file, or only its rule documents. */
      content: string;
      formats: RuleFormat[];
      groups: number;
      rules: number;
      /** Number of non-rule documents removed from a multi-document file. */
      strippedDocuments: number;
    }
  | { kind: 'skipped'; reason: string };

type RuleDocument = { format: RuleFormat; groups: number; rules: number };

// Guards against "billion laughs" alias expansion in hostile or broken files.
const MAX_ALIAS_COUNT = 100;

/**
 * Decides whether a YAML file is a Prometheus rule file, and returns what may be
 * uploaded. Only rule documents ever leave the machine: other documents (Secrets,
 * ConfigMaps, scrape configs) are dropped, because they routinely hold credentials.
 */
export function classify(source: string): Classification {
  const documents = parseAllDocuments(source, { prettyErrors: false });
  if (!Array.isArray(documents) || documents.length === 0) {
    return { kind: 'skipped', reason: 'empty file' };
  }

  const ruleDocuments: Document[] = [];
  const summaries: RuleDocument[] = [];
  let strippedDocuments = 0;
  let firstNonRuleHint: string | undefined;

  for (const document of documents) {
    const [firstError] = document.errors;
    if (firstError) {
      return { kind: 'skipped', reason: `invalid YAML: ${firstError.message.split('\n')[0]}` };
    }

    let value: unknown;
    try {
      value = document.toJS({ maxAliasCount: MAX_ALIAS_COUNT });
    } catch (error) {
      return { kind: 'skipped', reason: `invalid YAML: ${(error as Error).message}` };
    }
    if (value === null || value === undefined) {
      continue;
    }

    const summary = summarizeRuleDocument(value);
    if (summary) {
      ruleDocuments.push(document);
      summaries.push(summary);
    } else {
      strippedDocuments++;
      firstNonRuleHint ??= describeNonRuleDocument(value);
    }
  }

  if (ruleDocuments.length === 0) {
    return { kind: 'skipped', reason: firstNonRuleHint ?? 'empty file' };
  }

  const rules = summaries.reduce((total, summary) => total + summary.rules, 0);
  if (rules === 0) {
    return { kind: 'skipped', reason: 'no alerting or recording rule' };
  }

  const formats = (['prometheus', 'prometheus-rule-crd'] as const).filter((format) =>
    summaries.some((summary) => summary.format === format),
  );
  return {
    kind: 'rules',
    content: strippedDocuments === 0 ? source : joinDocuments(ruleDocuments),
    formats,
    groups: summaries.reduce((total, summary) => total + summary.groups, 0),
    rules,
    strippedDocuments,
  };
}

function summarizeRuleDocument(value: unknown): RuleDocument | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  let format: RuleFormat = 'prometheus';
  let container: Record<string, unknown> = value;
  if (value.kind !== undefined) {
    if (value.kind !== 'PrometheusRule' || !isRecord(value.spec)) {
      return undefined;
    }
    format = 'prometheus-rule-crd';
    container = value.spec;
  }

  if (!Array.isArray(container.groups)) {
    return undefined;
  }

  let rules = 0;
  for (const group of container.groups) {
    if (isRecord(group) && Array.isArray(group.rules)) {
      rules += group.rules.filter((rule) => isRecord(rule) && (rule.alert !== undefined || rule.record !== undefined)).length;
    }
  }
  return { format, groups: container.groups.length, rules };
}

function describeNonRuleDocument(value: unknown): string {
  if (isRecord(value)) {
    if ('scrape_configs' in value || 'global' in value || 'remote_write' in value) {
      return 'Prometheus server configuration (may contain credentials), not a rule file';
    }
    if ('route' in value || 'receivers' in value) {
      return 'Alertmanager configuration (may contain credentials), not a rule file';
    }
    if (typeof value.kind === 'string') {
      return `Kubernetes ${value.kind} resource, not a rule file`;
    }
  }
  return 'not a Prometheus rule file';
}

function joinDocuments(documents: Document[]): string {
  return documents
    .map((document, index) => {
      const text = document.toString();
      return index === 0 || text.startsWith('---') ? text : `---\n${text}`;
    })
    .join('');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
