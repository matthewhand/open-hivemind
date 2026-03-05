const fs = require('fs');
const file = 'src/server/middleware/formValidation.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/body\('flowise\.apiKey'\)\n\s*\.optional\(\)\n\s*\.isString\(\)\n\s*\.withMessage\('Flowise API key must be a string'\),/g, "body('flowise.apiKey').optional().isString().withMessage('Flowise API key must be a string'),");

code = code.replace(/body\('flowise\.apiKey'\)\n\s*\.optional\(\)\n\s*\.isString\(\)\n\s*\.withMessage\('Flowise API key must be a string'\)/g, "body('flowise.apiKey').optional().isString().withMessage('Flowise API key must be a string')");

fs.writeFileSync(file, code);
