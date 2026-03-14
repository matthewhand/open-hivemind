const fs = require('fs');
let jestConfig = fs.readFileSync('jest.config.js', 'utf8');
jestConfig = jestConfig.replace(/'\^@hivemind\/llm-letta\/\(\.\*\)\n.*?: '<rootDir>\/packages\/llm-letta\/src\/\$1',/s,
  `'^@hivemind/llm-letta/(.*)$': '<rootDir>/packages/llm-letta/src/$1',`
);
fs.writeFileSync('jest.config.js', jestConfig);
