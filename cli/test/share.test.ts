import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LINKEDIN_URL, TWITTER_URL } from '../src/constants.js';
import { palette } from '../src/output.js';
import { share, type Io, type ShareOptions } from '../src/share.js';
import { shareEndpoint, type UploadPayload } from '../src/upload.js';

const ruleFile = 'groups:\n  - name: g\n    rules:\n      - alert: A\n        expr: up == 0\n';

type Captured = { io: Io; stdout: string[]; stderr: string[]; requests: { url: string; payload: UploadPayload }[] };

function captureIo(response: { status: number; body: unknown }, overrides: Partial<Io> = {}): Captured {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const requests: Captured['requests'] = [];
  const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    requests.push({ url: String(url), payload: JSON.parse(String(init?.body)) as UploadPayload });
    return new Response(JSON.stringify(response.body), { status: response.status });
  });
  return {
    stdout,
    stderr,
    requests,
    io: {
      out: (line = '') => stdout.push(line),
      err: (line = '') => stderr.push(line),
      interactive: true,
      confirm: async () => true,
      colors: palette({ isTTY: false }, {}),
      fetch: fetchMock as unknown as typeof fetch,
      ...overrides,
    },
  };
}

describe('share', () => {
  let root: string;
  let options: ShareOptions;

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), 'apa-share-'));
    await mkdir(path.join(root, 'prometheus/rules'), { recursive: true });
    await writeFile(path.join(root, 'prometheus/rules/node.yml'), ruleFile);
    await writeFile(path.join(root, 'prometheus/prometheus.yml'), 'global: {}\nscrape_configs: []\n');
    options = {
      paths: [path.join(root, 'prometheus')],
      serverUrl: 'https://share.example.com',
      hostname: 'prom-01',
      yes: false,
      dryRun: false,
    };
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('uploads rule files only and thanks the user', async () => {
    const captured = captureIo({
      status: 201,
      body: { id: '2026-11-08/prom-01/120000.000Z', hostname: 'prom-01', files: [{ path: 'prometheus/rules/node.yml' }] },
    });

    const code = await share(options, captured.io);

    expect(code).toBe(0);
    expect(captured.requests).toHaveLength(1);
    expect(captured.requests[0]?.url).toBe('https://share.example.com/v1/shares');
    expect(captured.requests[0]?.payload).toEqual({
      hostname: 'prom-01',
      client: { name: 'awesome-prometheus-alerts', version: expect.any(String) },
      files: [{ path: 'prometheus/rules/node.yml', content: ruleFile }],
    });
    const output = captured.stdout.join('\n');
    expect(output).toContain('skipped: Prometheus server configuration (may contain credentials)');
    expect(output).toContain('Shared 1 file (reference: 2026-11-08/prom-01/120000.000Z)');
    expect(output).toContain('Thank you for sharing your alerting rules!');
    expect(output).toContain(TWITTER_URL);
    expect(output).toContain(LINKEDIN_URL);
  });

  it('does not upload during a dry run', async () => {
    const captured = captureIo({ status: 201, body: {} });

    const code = await share({ ...options, dryRun: true }, captured.io);

    expect(code).toBe(0);
    expect(captured.requests).toHaveLength(0);
    expect(captured.stdout.join('\n')).toContain('Dry run: nothing was uploaded.');
  });

  it('aborts when the user declines', async () => {
    const captured = captureIo({ status: 201, body: {} }, { confirm: async () => false });

    const code = await share(options, captured.io);

    expect(code).toBe(1);
    expect(captured.requests).toHaveLength(0);
  });

  it('requires --yes in a non-interactive shell', async () => {
    const captured = captureIo({ status: 201, body: {} }, { interactive: false });

    expect(await share(options, captured.io)).toBe(1);
    expect(captured.requests).toHaveLength(0);
    expect(captured.stderr.join('\n')).toContain('Re-run with --yes');
  });

  it('reports server rejections', async () => {
    const captured = captureIo({
      status: 422,
      body: { error: 'none of the files is a valid Prometheus rule file', rejected: [{ path: 'a.yml', reason: 'no groups key' }] },
    });

    const code = await share({ ...options, yes: true }, captured.io);

    expect(code).toBe(1);
    expect(captured.stderr).toContain('✖ Upload failed: none of the files is a valid Prometheus rule file');
    expect(captured.stderr).toContain('  - a.yml: no groups key');
  });

  it('fails when nothing can be shared', async () => {
    const captured = captureIo({ status: 201, body: {} });

    const code = await share({ ...options, paths: [path.join(root, 'prometheus/prometheus.yml')], yes: true }, captured.io);

    expect(code).toBe(1);
    expect(captured.requests).toHaveLength(0);
  });
});

describe('shareEndpoint', () => {
  it.each([
    ['https://share.example.com', 'https://share.example.com/v1/shares'],
    ['https://example.com/prefix', 'https://example.com/prefix/v1/shares'],
    ['http://localhost:4242', 'http://localhost:4242/v1/shares'],
    ['http://127.0.0.1:4242/', 'http://127.0.0.1:4242/v1/shares'],
  ])('resolves %s', (server, expected) => {
    expect(shareEndpoint(server).toString()).toBe(expected);
  });

  it.each(['http://share.example.com', 'ftp://localhost', 'not a url'])('rejects %s', (server) => {
    expect(() => shareEndpoint(server)).toThrow();
  });
});
