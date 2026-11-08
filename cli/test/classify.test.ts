import { describe, expect, it } from 'vitest';

import { classify } from '../src/classify.js';

const ruleFile = `# Node alerts
groups:
  - name: node
    rules:
      - alert: HostOutOfMemory
        expr: node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes < 0.1
      - record: instance:up:sum
        expr: sum by (instance) (up)
`;

const ruleCRD = `apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: example
spec:
  groups:
    - name: example # inline comment
      rules:
        - alert: ExampleDown
          expr: up{job="example"} == 0
`;

const secret = `apiVersion: v1
kind: Secret
metadata:
  name: credentials
stringData:
  password: hunter2
`;

describe('classify', () => {
  it('keeps a plain rule file unchanged', () => {
    const result = classify(ruleFile);

    expect(result).toEqual({
      kind: 'rules',
      content: ruleFile,
      formats: ['prometheus'],
      groups: 1,
      rules: 2,
      strippedDocuments: 0,
    });
  });

  it('accepts PrometheusRule resources', () => {
    const result = classify(ruleCRD);

    expect(result).toMatchObject({ kind: 'rules', formats: ['prometheus-rule-crd'], rules: 1 });
  });

  it('strips non-rule documents from multi-document files', () => {
    const result = classify(`${ruleCRD}---\n${secret}---\n${ruleFile}`);

    expect(result.kind).toBe('rules');
    if (result.kind !== 'rules') return;
    expect(result.strippedDocuments).toBe(1);
    expect(result.formats).toEqual(['prometheus', 'prometheus-rule-crd']);
    expect(result.rules).toBe(3);
    expect(result.content).not.toContain('hunter2');
    expect(result.content).not.toContain('kind: Secret');
    expect(result.content).toContain('# inline comment');
    expect(result.content).toContain('---\n# Node alerts');
    expect(classify(result.content)).toMatchObject({ kind: 'rules', rules: 3, strippedDocuments: 0 });
  });

  it.each([
    ['global:\n  scrape_interval: 15s\nscrape_configs: []\n', 'Prometheus server configuration (may contain credentials), not a rule file'],
    ['route:\n  receiver: slack\nreceivers: []\n', 'Alertmanager configuration (may contain credentials), not a rule file'],
    [secret, 'Kubernetes Secret resource, not a rule file'],
    ['foo: bar\n', 'not a Prometheus rule file'],
    ['- a\n- b\n', 'not a Prometheus rule file'],
    ['', 'empty file'],
    ['---\n---\n', 'empty file'],
    ['groups:\n  - name: empty\n    rules: []\n', 'no alerting or recording rule'],
    ['kind: PrometheusRule\nmetadata: {}\n', 'Kubernetes PrometheusRule resource, not a rule file'],
  ])('skips %j', (source, reason) => {
    expect(classify(source)).toEqual({ kind: 'skipped', reason });
  });

  it('skips invalid YAML', () => {
    const result = classify('groups: [\n');

    expect(result.kind).toBe('skipped');
    if (result.kind !== 'skipped') return;
    expect(result.reason).toMatch(/^invalid YAML: /);
  });

  it('skips files abusing aliases', () => {
    const lines = ['a: &a [x, x, x, x, x, x, x, x, x, x]'];
    for (let level = 1; level < 8; level++) {
      const ref = String.fromCharCode(96 + level);
      const name = String.fromCharCode(97 + level);
      lines.push(`${name}: &${name} [${Array(10).fill(`*${ref}`).join(', ')}]`);
    }
    lines.push('groups: []');

    const result = classify(lines.join('\n'));

    expect(result.kind).toBe('skipped');
  });
});
