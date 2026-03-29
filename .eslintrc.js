module.exports = {
  parser: '@typescript-eslint/parser',
  extends: ['eslint:recommended', '@typescript-eslint/recommended'],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'off',
    // Disallow console usage in production code (excluding CLI handlers for user output)
    // Use structured logging via Logger instead
    'no-console': ['warn', { allow: [] }]
  },
  overrides: [
    {
      // Allow console in CLI handlers (for user-facing output)
      files: ['src/cli/**/*.ts'],
      rules: {
        'no-console': 'off'
      }
    },
    {
      // Allow console in test files
      files: ['**/*.test.ts', '**/*.spec.ts', 'tests/**/*.ts'],
      rules: {
        'no-console': 'off'
      }
    }
  ]
};