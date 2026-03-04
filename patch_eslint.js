const fs = require('fs');
let content = fs.readFileSync('src/client/src/components/SearchFilterBar.tsx', 'utf8');

content = content.replace("  const handleClearFilter = (filter: FilterConfig) => {", "  const handleClearFilter = (filter: FilterConfig): void => {");
content = content.replace("  const handleClearSearch = () => {", "  const handleClearSearch = (): void => {");

fs.writeFileSync('src/client/src/components/SearchFilterBar.tsx', content);
