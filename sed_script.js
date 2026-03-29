const fs = require('fs');

const file = 'src/common/errors/HivemindError.ts';
let content = fs.readFileSync(file, 'utf8');

const regexes = [
  /export function getErrorCode[\s\S]*?^}\n/m,
  /export function getErrorCategory[\s\S]*?^}\n/m,
  /export function generateErrorId[\s\S]*?^}\n/m,
  /export function wrapError[\s\S]*?^}\n/m,
  /export class DatabaseNotInitializedError[\s\S]*?^}\n/m,
  /export class DatabaseConnectionError[\s\S]*?^}\n/m,
  /export class DatabaseQueryError[\s\S]*?^}\n/m,
  /export class BotNotFoundError[\s\S]*?^}\n/m,
  /export class MCPConnectionError[\s\S]*?^}\n/m,
  /export class MissingConfigError[\s\S]*?^}\n/m,
  /export class InputValidationError[\s\S]*?^}\n/m,
  /export class InvalidConfigError[\s\S]*?^}\n/m,
  /export class TimeoutError[\s\S]*?^}\n/m,
  /export class NotImplementedError[\s\S]*?^}\n/m,
];

regexes.forEach(regex => {
  content = content.replace(regex, '');
});

fs.writeFileSync(file, content, 'utf8');
console.log('Done cleaning HivemindError.ts');
