const typescriptParser = require('@typescript-eslint/parser');
const globals = require('globals');

module.exports = [
  // Global ignores - don't lint build output, dependencies, or generated files
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/*.min.js",
      "**/coverage/**",
      "**/playwright-report/**",
      "src/client/**", // Client has its own eslint.config.js
    ],
  },
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    languageOptions: {
      parser: typescriptParser,
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.es2021
      }
    },
    plugins: {
      '@typescript-eslint': require('@typescript-eslint/eslint-plugin')
    },
    rules: {
      // Errors - critical issues only
      'no-debugger': 'error',

      // Warnings - gradual cleanup (too many violations to fix immediately)
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/explicit-module-boundary-types': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/no-empty-function': 'warn',
      'eqeqeq': 'warn',
      'curly': 'warn',
      'no-console': 'warn',

      // Off - handled elsewhere or inconsistent in codebase
      'no-unused-vars': 'off', // Handled by @typescript-eslint/no-unused-vars
      'no-empty-function': 'off', // Handled by @typescript-eslint/no-empty-function
      'indent': 'off', // Inconsistent in codebase, let Prettier handle
      'quotes': 'off', // Inconsistent in codebase
      'semi': 'off', // Inconsistent in codebase
      'comma-dangle': 'off', // Inconsistent in codebase
    },
  },
  {
    files: ["src/**/*.js", "src/**/*.jsx"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.es2021
      }
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-console': 'warn',
      'no-debugger': 'error',
      'eqeqeq': 'warn',
      'curly': 'warn',
      // Off - inconsistent in codebase
      'indent': 'off',
      'quotes': 'off',
      'semi': 'off',
      'comma-dangle': 'off',
    },
  }
];

