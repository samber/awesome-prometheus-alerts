type Style = (text: string) => string;

export type Palette = {
  bold: Style;
  dim: Style;
  green: Style;
  yellow: Style;
  red: Style;
  cyan: Style;
};

const wrap =
  (open: number, close: number): Style =>
  (text) =>
    `\u001b[${open}m${text}\u001b[${close}m`;

const identity: Style = (text) => text;

/** Honors NO_COLOR (https://no-color.org) and FORCE_COLOR. */
export function palette(stream: { isTTY?: boolean }, env: NodeJS.ProcessEnv = process.env): Palette {
  const enabled = env.FORCE_COLOR ? env.FORCE_COLOR !== '0' : !env.NO_COLOR && Boolean(stream.isTTY);
  if (!enabled) {
    return { bold: identity, dim: identity, green: identity, yellow: identity, red: identity, cyan: identity };
  }
  return {
    bold: wrap(1, 22),
    dim: wrap(2, 22),
    green: wrap(32, 39),
    yellow: wrap(33, 39),
    red: wrap(31, 39),
    cyan: wrap(36, 39),
  };
}

export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KiB`;
  }
  return `${(bytes / 1024 / 1024).toFixed(1)} MiB`;
}
