const fs = require('fs');
const file = 'src/client/src/components/Settings/SettingsSecurity.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `<div className="form-control">
              <label className="label py-1">
                <span className="label-text text-sm font-medium">Time Window (seconds)</span>
              </label>
              <Input
                type="number"`;

const replacement = `<div className={\`form-control \${!settings.enableRateLimit ? 'opacity-50 pointer-events-none' : ''}\`}>
              <label className="label py-1">
                <span className="label-text text-sm font-medium">Time Window (seconds)</span>
              </label>
              <Input
                type="number"`;

content = content.replace(target, replacement);

const target2 = `<div className="form-control">
              <label className="label py-1">
                <span className="label-text text-sm font-medium">Max Requests per Window</span>
              </label>
              <Input
                type="number"`;

const replacement2 = `<div className={\`form-control \${!settings.enableRateLimit ? 'opacity-50 pointer-events-none' : ''}\`}>
              <label className="label py-1">
                <span className="label-text text-sm font-medium">Max Requests per Window</span>
              </label>
              <Input
                type="number"`;

content = content.replace(target2, replacement2);

fs.writeFileSync(file, content);
console.log('Patched');
