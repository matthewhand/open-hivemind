const fs = require('fs');
const path = require('path');
const parser = require('@typescript-eslint/parser');

function traverse(node, cb) {
  if (!node || typeof node !== 'object') return;

  if (node.type === 'FunctionDeclaration' ||
      node.type === 'FunctionExpression' ||
      node.type === 'ArrowFunctionExpression') {
    const loc = node.loc;
    if (loc) {
      const lines = loc.end.line - loc.start.line;
      cb({ file: '', line: loc.start.line, lines: lines, type: node.type });
    }
  }

  for (const key in node) {
    if (node[key] && typeof node[key] === 'object') {
      if (Array.isArray(node[key])) {
        node[key].forEach(child => traverse(child, cb));
      } else {
        traverse(node[key], cb);
      }
    }
  }
}

function analyzeFile(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  let ast;
  try {
    ast = parser.parse(code, {
      loc: true,
      range: true,
      jsx: true,
      ecmaFeatures: { jsx: true }
    });
  } catch(e) { return []; }

  const results = [];
  traverse(ast, (res) => {
    res.file = filePath;
    results.push(res);
  });
  return results;
}

function findTsFiles(dir) {
  let results = [];
  let list;
  try { list = fs.readdirSync(dir); } catch(e) { return results; }

  list.forEach(file => {
    file = path.join(dir, file);
    let stat;
    try { stat = fs.statSync(file); } catch(e) { return; }

    if (stat && stat.isDirectory() && !file.includes('node_modules') && !file.includes('dist')) {
      results = results.concat(findTsFiles(file));
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      results.push(file);
    }
  });
  return results;
}

const files = findTsFiles('src');
const allResults = [];
files.forEach(f => {
  const res = analyzeFile(f);
  if (res && res.length) allResults.push(...res);
});

allResults.sort((a,b) => b.lines - a.lines);
console.log("Top 30 longest functions:");
allResults.slice(0, 30).forEach(r => console.log(`${r.lines} lines: ${r.file}:${r.line}`));
