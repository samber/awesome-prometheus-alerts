import { CLIENT_NAME, CLIENT_VERSION, REQUEST_TIMEOUT_MS } from './constants.js';

export type UploadFile = { path: string; content: string };

export type UploadPayload = {
  hostname: string;
  client: { name: string; version: string };
  files: UploadFile[];
};

export type Issue = { document: number; group?: string; rule?: string; message: string };

export type AcceptedFile = {
  path: string;
  size: number;
  sha256: string;
  alerting_rules: number;
  recording_rules: number;
  issues?: Issue[];
};

export type RejectedFile = { path: string; reason: string };

export type Manifest = {
  id: string;
  hostname: string;
  files: AcceptedFile[];
  rejected?: RejectedFile[];
};

export class UploadError extends Error {
  constructor(
    message: string,
    readonly rejected: RejectedFile[] = [],
  ) {
    super(message);
    this.name = 'UploadError';
  }
}

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * Resolves the upload endpoint. Plain HTTP is only allowed for local
 * development servers, so rule files never travel unencrypted.
 */
export function shareEndpoint(serverUrl: string): URL {
  let base: URL;
  try {
    base = new URL(serverUrl.endsWith('/') ? serverUrl : `${serverUrl}/`);
  } catch {
    throw new UploadError(`invalid server URL: ${serverUrl}`);
  }
  const isLocal = LOCAL_HOSTNAMES.has(base.hostname) || base.hostname.endsWith('.localhost');
  if (base.protocol !== 'https:' && !(base.protocol === 'http:' && isLocal)) {
    throw new UploadError(`refusing to upload over ${base.protocol}//: use an https:// server URL`);
  }
  return new URL('v1/shares', base);
}

export async function upload(serverUrl: string, payload: UploadPayload, fetchImpl: typeof fetch = fetch): Promise<Manifest> {
  const endpoint = shareEndpoint(serverUrl);

  let response: Response;
  try {
    response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'user-agent': `${CLIENT_NAME}/${CLIENT_VERSION} node/${process.versions.node}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    const cause = (error as { cause?: Error }).cause;
    throw new UploadError(`could not reach ${endpoint.origin}: ${cause?.message ?? (error as Error).message}`);
  }

  const body = (await response.json().catch(() => undefined)) as
    | (Manifest & { error?: string; rejected?: RejectedFile[] })
    | undefined;

  if (response.status === 429) {
    throw new UploadError('too many uploads from your network, please retry in an hour');
  }
  if (!response.ok || !body) {
    throw new UploadError(body?.error ?? `server answered HTTP ${response.status}`, body?.rejected ?? []);
  }
  return body;
}
