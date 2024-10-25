const moduleAlias = require('module-alias');
const path = require('path');

moduleAlias.addAliases({
  '@src': path.resolve(__dirname, 'src'),
  '@command': path.resolve(__dirname, 'src/command'),
  '@common': path.resolve(__dirname, 'src/common'),
  '@config': path.resolve(__dirname, 'src/config'),
  '@llm': path.resolve(__dirname, 'src/llm'),
  '@message': path.resolve(__dirname, 'src/message'),
  '@webhook': path.resolve(__dirname, 'src/webhook'),
  '@integrations': path.resolve(__dirname, 'src/integrations'),
});
