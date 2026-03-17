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

const res = analyzeFile('src/client/src/components/UnifiedDashboard.tsx');
res.sort((a,b) => b.lines - a.lines);
console.log(res.slice(0, 10));
