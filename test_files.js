const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'src', 'client', 'src', 'pages');

const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.tsx'));

files.forEach(file => {
  const filePath = path.join(pagesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  let newContent = content.replace(/<PageHeader([^>]*?)>/g, (match, p1) => {
     return match.replace(/icon=\{([A-Z][A-Za-z0-9]+)\}/g, 'icon={<$1 className="w-6 h-6" />}');
  });

  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Updated ${file}`);
  }
});
