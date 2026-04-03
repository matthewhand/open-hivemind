const { execSync } = require('child_process');
const fs = require('fs');

try {
  console.log('Running tsc to collect errors...');
  execSync('npx tsc --noEmit', { stdio: 'pipe' });
} catch (error) {
  const output = error.stdout.toString();
  const regex = /([^:]+)\((\d+),(\d+)\): error TS1005: '\)' expected\./g;
  
  let match;
  const changes = {}; // file -> array of lines
  
  while ((match = regex.exec(output)) !== null) {
    const file = match[1];
    const line = parseInt(match[2], 10);
    if (!changes[file]) changes[file] = [];
    changes[file].push(line);
  }

  // Also catch 'error TS1003: Identifier expected' which happens when it says `});` but it's really missing `)`
  // Wait, let's just run it!
  const regex2 = /([^:]+)\((\d+),(\d+)\): error TS1003: Identifier expected\./g;
  while ((match = regex2.exec(output)) !== null) {
    const file = match[1];
    const line = parseInt(match[2], 10);
    if (!changes[file]) changes[file] = [];
    changes[file].push(line);
  }
  
  for (const file of Object.keys(changes)) {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8').split('\n');
      const lines = [...new Set(changes[file])].sort((a, b) => b - a);
      for (const line of lines) {
        let code = content[line - 1];
        if (code.includes('});')) {
          content[line - 1] = code.replace('});', '}));');
        } else if (code.includes(');')) {
          content[line - 1] = code.replace(');', '));');
        } else {
            console.log(`Could not automatically fix line ${line} in ${file}: ${code}`);
        }
      }
      fs.writeFileSync(file, content.join('\n'));
      console.log(`Patched ${file}`);
    }
  }
}
