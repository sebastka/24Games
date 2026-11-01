import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Flat config. Formatting is delegated to Prettier (eslint-config-prettier, last, turns off
// stylistic rules that would fight it); type errors are left to `tsc` (npm run typecheck).
export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'original'] },

  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },

  {
    files: ['src/**/*.{ts,tsx,js}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs['recommended-latest'].rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },

  {
    files: ['test/**/*.ts', 'scripts/**/*.ts', '*.config.{ts,js}'],
    languageOptions: { globals: globals.node },
  },

  prettier,
);
