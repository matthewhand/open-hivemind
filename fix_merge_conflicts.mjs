import fs from 'fs';
import path from 'path';

function walk(dir) {
  let results = [];
  try {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      file = path.join(dir, file);
      try {
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
          results = results.concat(walk(file));
        } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.css')) {
          results.push(file);
        }
      } catch (e) {}
    });
  } catch (e) {}
  return results;
}

function resolveConflicts(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes('<<<<<<< HEAD')) return false;

  const resolved = content.replace(/<<<<<<< HEAD\n([\s\S]*?)=======\n([\s\S]*?)>>>>>>> origin\/main\n?/g, '$2');
  fs.writeFileSync(filePath, resolved, 'utf8');
  return true;
}

walk('src').forEach(file => {
  if (resolveConflicts(file)) {
    console.log(`Resolved conflicts in ${file}`);
  }
});
