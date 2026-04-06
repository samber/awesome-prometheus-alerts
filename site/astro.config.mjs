import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import icon from 'astro-icon';
import { parse as parseYaml } from 'yaml';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/** Custom Vite plugin that parses YAML files using the 'yaml' package,
 *  which tolerates duplicate keys (last one wins) unlike js-yaml 4.x. */
function yamlPlugin() {
  return {
    name: 'vite-plugin-yaml-tolerant',
    transform(code, id) {
      if (!id.endsWith('.yml') && !id.endsWith('.yaml')) return null;
      const content = readFileSync(resolve(id), 'utf-8');
      const data = parseYaml(content, { merge: true, strict: false, uniqueKeys: false });
      return {
        code: `export default ${JSON.stringify(data)};`,
        map: null,
      };
    },
  };
}

export default defineConfig({
  site: 'https://samber.github.io',
  base: '/awesome-prometheus-alerts',
  output: 'static',
  integrations: [
    tailwind({ applyBaseStyles: false }),
    sitemap(),
    icon(),
  ],
  vite: {
    plugins: [yamlPlugin()],
    assetsInclude: ['**/*.yml'],
  },
});
