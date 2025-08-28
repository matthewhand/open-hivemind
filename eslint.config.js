const typescriptParser = require('@typescript-eslint/parser');

module.exports = [
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    languageOptions: {
      parser: typescriptParser,
      ecmaVersion: "latest",
      sourceType: "module"
    },
    plugins: {
      '@typescript-eslint': require('@typescript-eslint/eslint-plugin')
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn'],
      'no-console': ['error', { allow: [] }],
    },
  }
  ,
  {
    files: ["src/common/logger.ts"],
    rules: {
      'no-console': 'off'
    }
  }
];
