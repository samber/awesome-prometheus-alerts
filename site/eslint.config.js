import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import astro from 'eslint-plugin-astro';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: ['dist/**', 'public/pagefind/**', '.astro/**', 'node_modules/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs['flat/recommended'],
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    files: ['**/*.astro/*.js', '*.astro/*.js'],
    rules: {
      // Astro's client-side <script> blocks are compiled outside of the TS project,
      // so type-aware rules don't apply here.
      '@typescript-eslint/no-unused-vars': 'off',
    },
  }
);
