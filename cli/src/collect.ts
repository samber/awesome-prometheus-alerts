import { readdir, realpath, stat } from 'node:fs/promises';
import path from 'node:path';

import { MAX_SCANNED_ENTRIES } from './constants.js';

export type Candidate = {
  /** Absolute path on disk. */
  absolutePath: string;
  /** Path shown to the user, relative to the current directory when possible. */
  displayPath: string;
  /** Path sent to the server: never absolute, never contains the user's home layout. */
  uploadPath: string;
  size: number;
};

export type CollectResult = {
  candidates: Candidate[];
  warnings: string[];
};

const YAML_EXTENSION = /\.ya?ml$/i;
const SKIPPED_DIRECTORIES = new Set(['node_modules']);

/**
 * Expands the user's arguments into YAML files. Directories are walked
 * recursively; hidden entries and node_modules are skipped, and symlinked
 * directories are not followed to avoid cycles. Symlinked files are followed,
 * which matches how Kubernetes mounts ConfigMaps (`file -> ..data/file`).
 */
export async function collect(inputs: string[], cwd = process.cwd()): Promise<CollectResult> {
  const result: CollectResult = { candidates: [], warnings: [] };
  const seenFiles = new Set<string>();
  const usedRoots = new Set<string>();
  const budget = { remaining: MAX_SCANNED_ENTRIES };

  for (const input of inputs) {
    const absolute = path.resolve(cwd, input);
    let stats;
    try {
      stats = await stat(absolute);
    } catch {
      result.warnings.push(`${input}: no such file or directory`);
      continue;
    }

    if (stats.isDirectory()) {
      const root = uniqueName(path.basename(absolute) || 'root', usedRoots);
      await walk(absolute, root, cwd, result, seenFiles, budget);
    } else if (stats.isFile()) {
      if (!YAML_EXTENSION.test(absolute)) {
        result.warnings.push(`${input}: not a .yml or .yaml file`);
        continue;
      }
      await addFile(absolute, uniqueName(path.basename(absolute), usedRoots), stats.size, cwd, result, seenFiles);
    } else {
      result.warnings.push(`${input}: not a regular file or directory`);
    }
  }

  if (budget.remaining <= 0) {
    result.warnings.push(`stopped scanning after ${MAX_SCANNED_ENTRIES} entries: pass narrower paths`);
  }
  return result;
}

async function walk(
  directory: string,
  uploadPrefix: string,
  cwd: string,
  result: CollectResult,
  seenFiles: Set<string>,
  budget: { remaining: number },
): Promise<void> {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    result.warnings.push(`${displayPathOf(directory, cwd)}: ${(error as NodeJS.ErrnoException).code ?? 'unreadable'}`);
    return;
  }
  entries.sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    if (--budget.remaining < 0) {
      return;
    }
    if (entry.name.startsWith('.') || SKIPPED_DIRECTORIES.has(entry.name)) {
      continue;
    }

    const absolute = path.join(directory, entry.name);
    const uploadPath = `${uploadPrefix}/${entry.name}`;
    if (entry.isDirectory()) {
      await walk(absolute, uploadPath, cwd, result, seenFiles, budget);
      continue;
    }
    if (!YAML_EXTENSION.test(entry.name) || !(entry.isFile() || entry.isSymbolicLink())) {
      continue;
    }

    try {
      const stats = await stat(absolute);
      if (stats.isFile()) {
        await addFile(absolute, uploadPath, stats.size, cwd, result, seenFiles);
      }
    } catch {
      // Dangling symlink: nothing to share.
    }
  }
}

async function addFile(
  absolutePath: string,
  uploadPath: string,
  size: number,
  cwd: string,
  result: CollectResult,
  seenFiles: Set<string>,
): Promise<void> {
  const canonical = await realpath(absolutePath);
  if (seenFiles.has(canonical)) {
    return;
  }
  seenFiles.add(canonical);
  result.candidates.push({ absolutePath, displayPath: displayPathOf(absolutePath, cwd), uploadPath, size });
}

/** Returns name, or name-2, name-3... (before the extension) if already used. */
function uniqueName(name: string, used: Set<string>): string {
  const extension = YAML_EXTENSION.exec(name)?.[0] ?? '';
  const stem = name.slice(0, name.length - extension.length);
  let candidate = name;
  for (let index = 2; used.has(candidate); index++) {
    candidate = `${stem}-${index}${extension}`;
  }
  used.add(candidate);
  return candidate;
}

function displayPathOf(absolutePath: string, cwd: string): string {
  const relative = path.relative(cwd, absolutePath);
  return relative && !relative.startsWith('..') && !path.isAbsolute(relative) ? relative : absolutePath;
}
