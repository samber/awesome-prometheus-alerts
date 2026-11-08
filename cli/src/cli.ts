import { hostname as osHostname } from 'node:os';
import { createInterface } from 'node:readline/promises';
import { parseArgs } from 'node:util';

import { CLIENT_NAME, CLIENT_VERSION, DEFAULT_SERVER_URL, SERVER_URL_ENV } from './constants.js';
import { palette } from './output.js';
import { share } from './share.js';

const USAGE = `Usage: npx ${CLIENT_NAME} share [options] <file or directory...>

Share your Prometheus alerting rules with the awesome-prometheus-alerts project.
Directories are scanned recursively for .yml/.yaml files. Only Prometheus rule
files and PrometheusRule resources are sent: prometheus.yml, alertmanager.yml and
other YAML files are skipped, since they often contain credentials.

Options:
  -y, --yes              Skip the confirmation prompt
      --dry-run          Show what would be shared, without uploading
      --hostname <name>  Hostname to share under (default: this machine's hostname)
      --server <url>     Upload server (default: $${SERVER_URL_ENV} or ${DEFAULT_SERVER_URL})
  -h, --help             Show this help
  -v, --version          Show the version

Examples:
  npx ${CLIENT_NAME} share /etc/prometheus/rules
  npx ${CLIENT_NAME} share alerts.yml k8s/prometheus-rules/ --dry-run`;

/** Parses argv (without the node and script entries) and returns the exit code. */
export async function main(argv: string[]): Promise<number> {
  const err = (line = '') => process.stderr.write(`${line}\n`);

  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        yes: { type: 'boolean', short: 'y', default: false },
        'dry-run': { type: 'boolean', default: false },
        hostname: { type: 'string' },
        server: { type: 'string' },
        help: { type: 'boolean', short: 'h', default: false },
        version: { type: 'boolean', short: 'v', default: false },
      },
    });
  } catch (error) {
    err((error as Error).message);
    err();
    err(USAGE);
    return 2;
  }

  const { values, positionals } = parsed;
  if (values.version) {
    process.stdout.write(`${CLIENT_VERSION}\n`);
    return 0;
  }
  const [command, ...paths] = positionals;
  if (values.help || command === 'help') {
    process.stdout.write(`${USAGE}\n`);
    return 0;
  }
  if (command === undefined) {
    err(USAGE);
    return 2;
  }
  if (command !== 'share') {
    err(`Unknown command: ${command}`);
    err();
    err(USAGE);
    return 2;
  }
  if (paths.length === 0) {
    err('share: at least one file or directory is required');
    err();
    err(USAGE);
    return 2;
  }

  return share(
    {
      paths,
      serverUrl: values.server ?? process.env[SERVER_URL_ENV] ?? DEFAULT_SERVER_URL,
      hostname: values.hostname ?? osHostname(),
      yes: values.yes,
      dryRun: values['dry-run'],
    },
    {
      out: (line = '') => process.stdout.write(`${line}\n`),
      err,
      interactive: Boolean(process.stdin.isTTY && process.stdout.isTTY),
      confirm: askYesNo,
      colors: palette(process.stdout),
    },
  );
}

async function askYesNo(question: string): Promise<boolean> {
  const readline = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await readline.question(question);
    return /^y(es)?$/i.test(answer.trim());
  } finally {
    readline.close();
  }
}
