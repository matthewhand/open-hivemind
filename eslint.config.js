const tseslint = require('typescript-eslint');
const globals = require('globals');
const eslintPluginPrettier = require('eslint-plugin-prettier');
const eslintConfigPrettier = require('eslint-config-prettier');

module.exports = tseslint.config(
  // Global ignores
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/*.min.js',
      '**/coverage/**',
      '**/playwright-report/**',
      'src/client/**', // Client has its own eslint.config.js
      'archive/**',
      'scripts/**',
    ],
  },

  // Base setup for all files
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
    },
    plugins: {
      prettier: eslintPluginPrettier,
    },
    rules: {
      'prettier/prettier': 'error',
      'indent': ['error', 2, { SwitchCase: 1 }],
      'quotes': ['error', 'single', { avoidEscape: true, allowTemplateLiterals: true }],
      'semi': ['error', 'always'],
      'comma-dangle': ['error', 'es5'],
      'no-debugger': 'error',
      'eqeqeq': 'warn',
      'curly': ['warn', 'all'],
      'no-console': 'warn',
    },
  },

  // TypeScript Configuration (Type-Aware)
  // This automatically applies to .ts, .tsx, .mts, .cts files
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      // Custom overrides
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/explicit-module-boundary-types': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/no-empty-function': 'warn',

      // Disable base rules replaced by TS rules
      'no-unused-vars': 'off',
      'no-empty-function': 'off',
    },
  },

  // JavaScript files
  {
    files: ['**/*.js', '**/*.jsx'],
    ...tseslint.configs.disableTypeChecked,
    rules: {
      ...tseslint.configs.disableTypeChecked.rules,
      'no-unused-vars': 'warn',
    },
  },

  // Test files - Disable type checking and relax rules
  {
    files: ['tests/**/*.ts', 'tests/**/*.js', '**/*.test.ts', '**/*.test.js'],
    ...tseslint.configs.disableTypeChecked,
    languageOptions: {
      ...tseslint.configs.disableTypeChecked.languageOptions,
      globals: {
        ...globals.jest,
      },
    },
    rules: {
      ...tseslint.configs.disableTypeChecked.rules,
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      'no-console': 'off',
    },
  },

  // Prettier config (last to override others)
  eslintConfigPrettier,
);
