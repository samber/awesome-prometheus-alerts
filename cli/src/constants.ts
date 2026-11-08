import { readFileSync } from 'node:fs';

type PackageJson = { name: string; version: string };

// dist/constants.js and src/constants.ts both sit one level below package.json.
const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as PackageJson;

export const CLIENT_NAME = packageJson.name;
export const CLIENT_VERSION = packageJson.version;

export const DEFAULT_SERVER_URL = 'https://share.awesome-prometheus-alerts.samber.dev';
export const SERVER_URL_ENV = 'APA_SHARE_URL';

export const TWITTER_URL = 'https://x.com/samuelberthe';
export const LINKEDIN_URL = 'https://www.linkedin.com/in/samuelberthe/';
export const PROJECT_URL = 'https://samber.github.io/awesome-prometheus-alerts/';

// Keep these limits aligned with the server defaults (server/internal/config).
export const MAX_FILES = 500;
export const MAX_FILE_BYTES = 1024 * 1024;
export const MAX_TOTAL_BYTES = 10 * 1024 * 1024;

// Bounds directory walking when a user points the CLI at a very large tree (e.g. `/`).
export const MAX_SCANNED_ENTRIES = 50_000;

export const REQUEST_TIMEOUT_MS = 120_000;
