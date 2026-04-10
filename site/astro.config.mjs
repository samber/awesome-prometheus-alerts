import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import icon from 'astro-icon';
import { parse as parseYaml } from 'yaml';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function normalizeViteId(id) {
  const cleanId = id.split('?', 1)[0].split('#', 1)[0];
  return cleanId.startsWith('/@fs/') ? cleanId.slice(4) : cleanId;
}

/** Custom Vite plugin that parses YAML files using the 'yaml' package,
 *  which tolerates duplicate keys (last one wins) unlike js-yaml 4.x. */
function yamlPlugin() {
  return {
    name: 'vite-plugin-yaml-tolerant',
    transform(code, id) {
      const normalizedId = normalizeViteId(id);
      if (!normalizedId.endsWith('.yml') && !normalizedId.endsWith('.yaml')) return null;
      const content = typeof code === 'string' ? code : readFileSync(resolve(normalizedId), 'utf-8');
      const data = parseYaml(content, { merge: true, strict: false, uniqueKeys: false });
      return {
        code: `export default ${JSON.stringify(data)};`,
        map: null,
      };
    },
  };
}

const toSlug = (name) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/** Build redirect map: old flat /rules/{service} paths → new /rules/{group}/{service}/ paths */
function buildRedirects(base) {
  try {
    const rulesPath = resolve(__dirname, '../_data/rules.yml');
    const raw = readFileSync(rulesPath, 'utf-8');
    const { groups } = parseYaml(raw, { merge: true, strict: false, uniqueKeys: false });
    const redirects = {};
    for (const group of groups) {
      const groupSlug = toSlug(group.name);
      for (const service of group.services) {
        const serviceSlug = toSlug(service.name);
        // Old anchor slug (spaces → hyphens only, no other substitutions)
        const oldSlug = service.name.replace(/ /g, '-').toLowerCase();
        const newPath = `${base}/rules/${groupSlug}/${serviceSlug}/`;
        // Redirect from flat old path (without trailing slash; Astro handles the slash variant)
        const oldPath = `${base}/rules/${oldSlug}`;
        if (oldPath !== newPath && oldPath !== newPath.slice(0, -1)) {
          redirects[oldPath] = { destination: newPath, status: 301 };
        }
      }
    }
    return redirects;
  } catch {
    return {};
  }
}

const base = '/awesome-prometheus-alerts';

export default defineConfig({
  site: 'https://samber.github.io',
  base,
  redirects: buildRedirects(base),
  output: 'static',
  integrations: [
    sitemap({
      serialize(item) {
        const path = new URL(item.url).pathname;
        const segments = path.replace(/^\/|\/$/g, '').split('/').filter(Boolean);
        // segments[0] = 'awesome-prometheus-alerts', [1] = 'rules'|guide, [2] = group, [3] = service

        if (segments.length <= 1) {
          // Homepage
          return { ...item, changefreq: 'weekly', priority: 1.0, lastmod: new Date() };
        }
        if (segments.length === 2 && segments[1] === 'rules') {
          // /rules/ index
          return { ...item, changefreq: 'weekly', priority: 0.9, lastmod: new Date() };
        }
        if (segments.length === 3 && segments[1] === 'rules') {
          // /rules/[group]/ index
          return { ...item, changefreq: 'monthly', priority: 0.7, lastmod: new Date() };
        }
        if (segments.length === 4 && segments[1] === 'rules') {
          // /rules/[group]/[service]/ — main content pages
          return { ...item, changefreq: 'monthly', priority: 0.8, lastmod: new Date() };
        }
        // Guide pages and others
        return { ...item, changefreq: 'yearly', priority: 0.6, lastmod: new Date() };
      },
    }),
    icon(),
  ],
  vite: {
    plugins: [tailwindcss(), yamlPlugin()],
  },
});
