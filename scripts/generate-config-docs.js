const fs = require('fs');
const path = require('path');

const metaDir = path.join(__dirname, '..', 'src', 'config', 'meta');
const outPath = path.join(__dirname, '..', 'docs', 'config-reference.md');

function loadMetas() {
  const files = fs.readdirSync(metaDir).filter(f => f.endsWith('.json'));
  const metas = files.map(f => ({ name: f.replace(/\.json$/, ''), data: JSON.parse(fs.readFileSync(path.join(metaDir, f), 'utf-8')) }));
  return metas;
}

function buildIndex(metas) {
  const out = { basic: {}, advanced: {} };
  for (const m of metas) {
    const group = m.data.group || m.name;
    const keys = m.data.keys || {};
    for (const [k, v] of Object.entries(keys)) {
      const level = (v && v.level) || 'advanced';
      const doc = (v && v.doc) || '';
      if (!out[level][group]) out[level][group] = [];
      out[level][group].push({ key: k, doc });
    }
  }
  // sort groups/keys
  for (const lvl of Object.keys(out)) {
    const groups = out[lvl];
    for (const g of Object.keys(groups)) {
      groups[g].sort((a,b) => a.key.localeCompare(b.key));
    }
  }
  return out;
}

function render(index) {
  let md = '# Config Reference (Generated)\n\n';
  function section(levelTitle, levelKey) {
    md += `## ${levelTitle}\n\n`;
    const groups = index[levelKey];
    const groupNames = Object.keys(groups).sort();
    for (const g of groupNames) {
      md += `### ${g}\n`;
      for (const item of groups[g]) {
        md += `- ${item.key}${item.doc ? `: ${item.doc}` : ''}\n`;
      }
      md += '\n';
    }
  }
  section('Basic', 'basic');
  section('Advanced', 'advanced');
  return md;
}

function main() {
  const metas = loadMetas();
  const index = buildIndex(metas);
  const md = render(index);
  fs.writeFileSync(outPath, md);
  console.log('Wrote', outPath);
}

if (require.main === module) main();

