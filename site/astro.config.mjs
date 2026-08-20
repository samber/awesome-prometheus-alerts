import { defineConfig, envField } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import icon from 'astro-icon';
import { parse as parseYaml } from 'yaml';
import { readFileSync } from 'fs';
import { resolve } from 'path';

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

const base = '/awesome-prometheus-alerts';

export default defineConfig({
  site: 'https://samber.github.io',
  base,
  output: 'static',
  env: {
    schema: {
      // Raises the GitHub API rate limit from 60 to 5000 req/hour; matters in CI where
      // runners share IPs and easily trip the unauthenticated limit.
      GITHUB_TOKEN: envField.string({ context: 'server', access: 'secret', optional: true }),
    },
  },
  integrations: [
    sitemap({
      /** Exclude the legacy `*.html` meta-refresh redirect stubs (src/pages/*.html.astro) from
       *  the sitemap so Google only indexes canonical destinations, not the redirect intermediaries. */
      filter: (page) => !page.includes('.html'),
      serialize(item) {
        const path = new URL(item.url).pathname;
        const segments = path.replace(/^\/|\/$/g, '').split('/').filter(Boolean);
        // segments[0] = 'awesome-prometheus-alerts', [1] = 'rules'|guide, [2] = group, [3] = service

        if (segments.length <= 1) {
          // Homepage
          return { ...item, changefreq: 'weekly', priority: 1.0 };
        }
        if (segments.length === 2 && segments[1] === 'rules') {
          // /rules/ index
          return { ...item, changefreq: 'weekly', priority: 0.9 };
        }
        if (segments.length === 3 && segments[1] === 'rules') {
          // /rules/[group]/ index
          return { ...item, changefreq: 'monthly', priority: 0.7 };
        }
        if (segments.length === 4 && segments[1] === 'rules') {
          // /rules/[group]/[service]/ — main content pages
          return { ...item, changefreq: 'monthly', priority: 0.8 };
        }
        // Guide pages and others
        return { ...item, changefreq: 'yearly', priority: 0.6 };
      },
    }),
    icon(),
  ],
  vite: {
    plugins: [tailwindcss(), yamlPlugin()],
  },
});
