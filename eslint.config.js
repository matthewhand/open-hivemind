const typescriptParser = require('@typescript-eslint/parser');

module.exports = [
  {
    files: [
      "src/**/*.ts",
      "src/**/*.tsx",
      "src/frontend/**/*.ts",
      "src/frontend/**/*.tsx"
    ],
    languageOptions: {
      parser: typescriptParser,
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      '@typescript-eslint': require('@typescript-eslint/eslint-plugin')
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn'],
    },
  }
];
