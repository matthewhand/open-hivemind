const typescriptParser = require('@typescript-eslint/parser');
const globals = require('globals');
const eslintPluginPrettier = require('eslint-plugin-prettier');
const eslintConfigPrettier = require('eslint-config-prettier');

module.exports = [
  // Global ignores - don't lint build output, dependencies, or generated files
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
  // TypeScript files in src/
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    languageOptions: {
      parser: typescriptParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
    },
    plugins: {
      '@typescript-eslint': require('@typescript-eslint/eslint-plugin'),
      prettier: eslintPluginPrettier,
    },
    rules: {
      // Prettier integration
      'prettier/prettier': 'error',

      // Code style - now enforced
      'indent': ['error', 2, { SwitchCase: 1 }],
      'quotes': ['error', 'single', { avoidEscape: true, allowTemplateLiterals: true }],
      'semi': ['error', 'always'],
      'comma-dangle': ['error', 'es5'],

      // Errors - critical issues only
      'no-debugger': 'error',

      // Warnings - gradual cleanup
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
      'eqeqeq': 'warn',
      'curly': ['warn', 'all'],
      'no-console': 'warn',

      // Off - handled elsewhere
      'no-unused-vars': 'off', // Handled by @typescript-eslint/no-unused-vars
      'no-empty-function': 'off', // Handled by @typescript-eslint/no-empty-function
    },
  },
  // JavaScript files in src/
  {
    files: ['src/**/*.js', 'src/**/*.jsx'],
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
      // Prettier integration
      'prettier/prettier': 'error',

      // Code style - now enforced
      'indent': ['error', 2, { SwitchCase: 1 }],
      'quotes': ['error', 'single', { avoidEscape: true, allowTemplateLiterals: true }],
      'semi': ['error', 'always'],
      'comma-dangle': ['error', 'es5'],

      // Other rules
      'no-unused-vars': 'warn',
      'no-console': 'warn',
      'no-debugger': 'error',
      'eqeqeq': 'warn',
      'curly': ['warn', 'all'],
    },
  },
  // Test files - relaxed rules
  {
    files: ['tests/**/*.ts', 'tests/**/*.js', '**/*.test.ts', '**/*.test.js'],
    languageOptions: {
      parser: typescriptParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2021,
        ...globals.jest,
      },
    },
    plugins: {
      '@typescript-eslint': require('@typescript-eslint/eslint-plugin'),
      prettier: eslintPluginPrettier,
    },
    rules: {
      // Prettier integration
      'prettier/prettier': 'error',

      // Code style - now enforced
      'indent': ['error', 2, { SwitchCase: 1 }],
      'quotes': ['error', 'single', { avoidEscape: true, allowTemplateLiterals: true }],
      'semi': ['error', 'always'],
      'comma-dangle': ['error', 'es5'],

      // Relaxed rules for tests
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      'no-console': 'off',
    },
  },
  // Prettier config override to turn off conflicting rules
  eslintConfigPrettier,
];
