export default [
  {
    files: ['src/client/src/**/*.tsx', 'src/client/src/**/*.ts'],
    rules: {
      'complexity': ['warn', 20],
      'max-lines-per-function': ['warn', 100]
    }
  }
];
