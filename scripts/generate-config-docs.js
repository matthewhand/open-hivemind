const fs = require('fs');
const path = require('path');

const metaDir = path.join(__dirname, '..', 'src', 'config', 'meta');
const outPath = path.join(__dirname, '..', 'docs', 'config-reference.md');

// Try to enable TS requires for module-level meta
try {
  require('ts-node').register({ transpileOnly: true });
} catch {
  // ts-node not available; will rely on JSON metas
}

function loadJsonMetas() {
  if (!fs.existsSync(metaDir)) return [];
  const files = fs.readdirSync(metaDir).filter(f => f.endsWith('.json'));
  return files.map(f => ({ name: f.replace(/\.json$/, ''), data: JSON.parse(fs.readFileSync(path.join(metaDir, f), 'utf-8')) }));
}

function loadModuleMetas() {
  const modules = [
    { path: '../src/config/messageConfig.ts', exportName: 'configMeta' },
    { path: '../src/config/appConfig.ts', exportName: 'configMeta' },
  ];
  const out = [];
  for (const m of modules) {
    try {
      const mod = require(m.path);
      const meta = mod[m.exportName];
      if (meta && meta.keys) {
        const group = meta.module || 'unknown';
        const keys = {};
        for (const k of meta.keys) {
          keys[k.key] = { level: k.level, doc: k.doc };
        }
        out.push({ name: group, data: { group, keys } });
      }
    } catch (e) {
      // ignore if module not loadable
    }
  }
  return out;
}

function buildIndex(metas) {
  const out = { basic: {}, advanced: {} };
  for (const m of metas) {
    const group = m.data.group || m.name;
    const keys = m.data.keys || {};
    // keys is either map (from JSON meta) or array (from module meta conversion)
    if (Array.isArray(keys)) {
      for (const item of keys) {
        const level = item.level || 'advanced';
        if (!out[level][group]) out[level][group] = [];
        out[level][group].push({ key: item.key, doc: item.doc, env: item.env, def: item.default });
      }
    } else {
      for (const [k, v] of Object.entries(keys)) {
        const level = (v && v.level) || 'advanced';
        const doc = (v && v.doc) || '';
        if (!out[level][group]) out[level][group] = [];
        out[level][group].push({ key: k, doc });
      }
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
        const tail = [];
        if (item.doc) tail.push(item.doc);
        if (item.env) tail.push(`env=${item.env}`);
        if (typeof item.def !== 'undefined') tail.push(`default=${JSON.stringify(item.def)}`);
        md += `- ${item.key}${tail.length ? ` — ${tail.join(' | ')}` : ''}\n`;
      }
      md += '\n';
    }
  }
  section('Basic', 'basic');
  section('Advanced', 'advanced');
  return md;
}

function main() {
  const metas = [...loadModuleMetas(), ...loadJsonMetas()];
  const index = buildIndex(metas);
  const md = render(index);
  fs.writeFileSync(outPath, md);
  console.log('Wrote', outPath);
}

if (require.main === module) main();
