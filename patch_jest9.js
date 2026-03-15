const fs = require('fs');

let configStr = fs.readFileSync('jest.config.js', 'utf8');

const target = `'^@hivemind/llm-letta/(.*)\\$$': '<rootDir>/packages/llm-letta/src/$1',`;

const replacements = [
  `'^@hivemind/shared-types\\$$': '<rootDir>/packages/shared-types/src/index.ts',`,
  `'^@hivemind/shared-types/(.*)\\$$': '<rootDir>/packages/shared-types/src/$1',`,
  `'^@hivemind/message-slack\\$$': '<rootDir>/packages/message-slack/src/index.ts',`,
  `'^@hivemind/message-slack/(.*)\\$$': '<rootDir>/packages/message-slack/src/$1',`,
  `'^@hivemind/message-discord\\$$': '<rootDir>/packages/message-discord/src/index.ts',`,
  `'^@hivemind/message-discord/(.*)\\$$': '<rootDir>/packages/message-discord/src/$1',`,
  `'^@hivemind/message-mattermost\\$$': '<rootDir>/packages/message-mattermost/src/index.ts',`,
  `'^@hivemind/message-mattermost/(.*)\\$$': '<rootDir>/packages/message-mattermost/src/$1',`,
  `'^@hivemind/llm-openai\\$$': '<rootDir>/packages/llm-openai/src/index.ts',`,
  `'^@hivemind/llm-openai/(.*)\\$$': '<rootDir>/packages/llm-openai/src/$1',`,
  `'^@hivemind/llm-openswarm\\$$': '<rootDir>/packages/llm-openswarm/src/index.ts',`,
  `'^@hivemind/llm-openswarm/(.*)\\$$': '<rootDir>/packages/llm-openswarm/src/$1',`,
  `'^@hivemind/llm-openwebui\\$$': '<rootDir>/packages/llm-openwebui/src/index.ts',`,
  `'^@hivemind/llm-openwebui/(.*)\\$$': '<rootDir>/packages/llm-openwebui/src/$1',`,
  `'^@hivemind/memory-mem0\\$$': '<rootDir>/packages/memory-mem0/src/index.ts',`,
  `'^@hivemind/memory-mem0/(.*)\\$$': '<rootDir>/packages/memory-mem0/src/$1',`,
  `'^@hivemind/memory-mem4ai\\$$': '<rootDir>/packages/memory-mem4ai/src/index.ts',`,
  `'^@hivemind/memory-mem4ai/(.*)\\$$': '<rootDir>/packages/memory-mem4ai/src/$1',`,
  `'^@hivemind/memory-memvault\\$$': '<rootDir>/packages/memory-memvault/src/index.ts',`,
  `'^@hivemind/memory-memvault/(.*)\\$$': '<rootDir>/packages/memory-memvault/src/$1',`
].join('\n    ');

configStr = configStr.replace(target, target + '\n    ' + replacements);

fs.writeFileSync('jest.config.js', configStr);
