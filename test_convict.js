const convict = require('convict');
const fs = require('fs');
fs.writeFileSync('test.json', '{ malformed json }');
const config = convict({ a: { default: 'a' } });
try {
  config.loadFile('test.json');
} catch (error) {
  console.log('Error type:', typeof error);
  console.log('Error code:', error.code);
  console.log('Error message:', error.message);
  console.log('Error name:', error.name);
}
