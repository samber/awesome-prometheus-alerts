import { readFile } from 'node:fs/promises';

import { classify } from './classify.js';
import { collect } from './collect.js';
import {
  CLIENT_NAME,
  CLIENT_VERSION,
  LINKEDIN_URL,
  MAX_FILE_BYTES,
  MAX_FILES,
  MAX_TOTAL_BYTES,
  PROJECT_URL,
  TWITTER_URL,
} from './constants.js';
import { formatBytes, plural, type Palette } from './output.js';
import { upload, UploadError, type Manifest, type UploadFile } from './upload.js';

export type ShareOptions = {
  paths: string[];
  serverUrl: string;
  hostname: string;
  yes: boolean;
  dryRun: boolean;
};

export type Io = {
  out: (line?: string) => void;
  err: (line?: string) => void;
  /** Whether a human can answer the confirmation prompt. */
  interactive: boolean;
  confirm: (question: string) => Promise<boolean>;
  colors: Palette;
  fetch?: typeof fetch;
  cwd?: string;
};

type Selected = UploadFile & { displayPath: string; rules: number };

/** Runs `share` and returns the process exit code. */
export async function share(options: ShareOptions, io: Io): Promise<number> {
  const { out, err, colors } = io;
  const { candidates, warnings } = await collect(options.paths, io.cwd);
  for (const warning of warnings) {
    err(colors.yellow(`! ${warning}`));
  }

  const selected: Selected[] = [];
  out(colors.bold(`Scanning ${plural(candidates.length, 'YAML file')}...`));
  for (const candidate of candidates) {
    if (candidate.size > MAX_FILE_BYTES) {
      out(`  ${colors.dim('-')} ${candidate.displayPath} ${colors.dim(`skipped: larger than ${formatBytes(MAX_FILE_BYTES)}`)}`);
      continue;
    }

    let classification;
    try {
      classification = classify(await readFile(candidate.absolutePath, 'utf8'));
    } catch (error) {
      out(`  ${colors.dim('-')} ${candidate.displayPath} ${colors.dim(`skipped: ${(error as Error).message}`)}`);
      continue;
    }
    if (classification.kind === 'skipped') {
      out(`  ${colors.dim('-')} ${candidate.displayPath} ${colors.dim(`skipped: ${classification.reason}`)}`);
      continue;
    }

    const details = [plural(classification.rules, 'rule')];
    if (classification.formats.includes('prometheus-rule-crd')) {
      details.push('PrometheusRule');
    }
    if (classification.strippedDocuments > 0) {
      details.push(`${plural(classification.strippedDocuments, 'non-rule document')} removed`);
    }
    out(`  ${colors.green('✔')} ${candidate.displayPath} ${colors.dim(`(${details.join(', ')})`)}`);
    selected.push({
      path: candidate.uploadPath,
      content: classification.content,
      displayPath: candidate.displayPath,
      rules: classification.rules,
    });
  }
  out();

  if (selected.length === 0) {
    err(colors.red('✖ No Prometheus rule file found. Pass rule files or the directories holding them.'));
    return 1;
  }
  const totalBytes = selected.reduce((total, file) => total + Buffer.byteLength(file.content), 0);
  if (selected.length > MAX_FILES || totalBytes > MAX_TOTAL_BYTES) {
    err(
      colors.red(
        `✖ Too much to share at once (${plural(selected.length, 'file')}, ${formatBytes(totalBytes)}). ` +
          `The limit is ${MAX_FILES} files and ${formatBytes(MAX_TOTAL_BYTES)}: share fewer paths per run.`,
      ),
    );
    return 1;
  }

  const ruleCount = selected.reduce((total, file) => total + file.rules, 0);
  out(`About to share ${colors.bold(plural(selected.length, 'file'))} (${plural(ruleCount, 'rule')}, ${formatBytes(totalBytes)})`);
  out(`  server:   ${options.serverUrl}`);
  out(`  hostname: ${options.hostname} ${colors.dim('(change it with --hostname)')}`);
  out();
  out(colors.dim('Only the files above, their relative paths and this hostname are sent.'));
  out(colors.dim('Rule files can reveal internal names (hosts, jobs, teams, URLs): review them first.'));
  out(colors.dim('The maintainer reads them to improve the public collection; rules derived from'));
  out(colors.dim('them may be published in awesome-prometheus-alerts under CC BY 4.0.'));
  out();

  if (options.dryRun) {
    out(colors.cyan('Dry run: nothing was uploaded.'));
    return 0;
  }
  if (!options.yes) {
    if (!io.interactive) {
      err(colors.red('✖ Refusing to upload without confirmation in a non-interactive shell. Re-run with --yes.'));
      return 1;
    }
    if (!(await io.confirm('Share these files? [y/N] '))) {
      out('Aborted: nothing was uploaded.');
      return 1;
    }
  }

  let manifest: Manifest;
  try {
    manifest = await upload(
      options.serverUrl,
      {
        hostname: options.hostname,
        client: { name: CLIENT_NAME, version: CLIENT_VERSION },
        files: selected.map(({ path, content }) => ({ path, content })),
      },
      io.fetch,
    );
  } catch (error) {
    if (!(error instanceof UploadError)) {
      throw error;
    }
    err(colors.red(`✖ Upload failed: ${error.message}`));
    for (const rejected of error.rejected) {
      err(`  ${colors.dim('-')} ${rejected.path}: ${rejected.reason}`);
    }
    return 1;
  }

  printSuccess(manifest, io);
  return 0;
}

function printSuccess(manifest: Manifest, { out, colors }: Io): void {
  out(colors.green(`✔ Shared ${plural(manifest.files.length, 'file')} (reference: ${manifest.id}).`));
  for (const rejected of manifest.rejected ?? []) {
    out(`  ${colors.dim('-')} ${rejected.path} ${colors.dim(`not kept by the server: ${rejected.reason}`)}`);
  }
  out();
  out(colors.bold('Thank you for sharing your alerting rules! 🙏'));
  out(`They help make ${PROJECT_URL} better for everyone.`);
  out();
  out('Follow the project and its author for updates:');
  out(`  X (Twitter): ${colors.cyan(TWITTER_URL)}`);
  out(`  LinkedIn:    ${colors.cyan(LINKEDIN_URL)}`);
}
