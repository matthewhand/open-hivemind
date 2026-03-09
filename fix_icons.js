const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'src', 'client', 'src', 'pages');

const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.tsx'));

files.forEach(file => {
  const filePath = path.join(pagesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Find <PageHeader block and check if icon={} is used
  const pageHeaderRegex = /<PageHeader([^>]*?)>/gs;

  let newContent = content.replace(pageHeaderRegex, (fullMatch, p1) => {
    // Only replace icon={IconName} if it's not already <IconName />
    const iconRegex = /icon=\{([A-Z][a-zA-Z0-9]+)\}/;
    if (iconRegex.test(p1)) {
      return fullMatch.replace(iconRegex, (m, iconName) => {
        return `icon={<${iconName} className="w-6 h-6" />}`;
      });
    }
    return fullMatch;
  });

  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Updated ${file}`);
  }
});
