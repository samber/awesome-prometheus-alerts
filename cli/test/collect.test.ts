import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { collect } from '../src/collect.js';

describe('collect', () => {
  let root: string;

  const touch = async (relative: string, content = 'groups: []\n') => {
    const file = path.join(root, relative);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, content);
  };

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), 'apa-collect-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('walks directories recursively and keeps paths relative to the argument', async () => {
    await touch('prometheus/rules/node.yml');
    await touch('prometheus/rules/nested/db.YAML');
    await touch('prometheus/README.md');
    await touch('prometheus/.git/config.yml');
    await touch('prometheus/node_modules/pkg/x.yml');

    const { candidates, warnings } = await collect(['prometheus'], root);

    expect(warnings).toEqual([]);
    expect(candidates.map((candidate) => candidate.uploadPath)).toEqual([
      'prometheus/rules/nested/db.YAML',
      'prometheus/rules/node.yml',
    ]);
    expect(candidates[1]?.displayPath).toBe(path.join('prometheus', 'rules', 'node.yml'));
  });

  it('never sends absolute paths', async () => {
    await touch('etc/prometheus/alerts.yml');

    const { candidates } = await collect([path.join(root, 'etc/prometheus/alerts.yml'), path.join(root, 'etc')], '/');

    expect(candidates.map((candidate) => candidate.uploadPath)).toEqual(['alerts.yml']);
  });

  it('renames colliding roots and ignores duplicate files', async () => {
    await touch('a/rules/x.yml');
    await touch('b/rules/x.yml');
    await touch('a/alerts.yml');
    await touch('b/alerts.yml');

    const { candidates } = await collect(['a/rules', 'b/rules', 'a/alerts.yml', 'b/alerts.yml', 'a/rules/x.yml'], root);

    expect(candidates.map((candidate) => candidate.uploadPath)).toEqual([
      'rules/x.yml',
      'rules-2/x.yml',
      'alerts.yml',
      'alerts-2.yml',
    ]);
  });

  it('follows symlinked files but not symlinked directories', async () => {
    await touch('rules/..data/node.yml');
    await symlink(path.join(root, 'rules/..data/node.yml'), path.join(root, 'rules/node.yml'));
    await symlink(path.join(root, 'rules'), path.join(root, 'rules/loop'));
    await symlink(path.join(root, 'missing.yml'), path.join(root, 'rules/dangling.yml'));

    const { candidates } = await collect(['rules'], root);

    expect(candidates.map((candidate) => candidate.uploadPath)).toEqual(['rules/node.yml']);
  });

  it('warns about missing paths and non-YAML files', async () => {
    await touch('notes.txt', 'hello');

    const { candidates, warnings } = await collect(['missing', 'notes.txt'], root);

    expect(candidates).toEqual([]);
    expect(warnings).toEqual(['missing: no such file or directory', 'notes.txt: not a .yml or .yaml file']);
  });
});
