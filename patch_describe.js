const fs = require('fs');
let content = fs.readFileSync('src/client/src/components/__tests__/SearchFilterBar.test.tsx', 'utf8');

// The last 3 tests are outside the describe block because of how they were appended previously
content = content.replace("  });\n});\n\n  it('renders active filter chips', () => {", "  });\n\n  it('renders active filter chips', () => {");
content = content + "\n});"; // add closing brace

fs.writeFileSync('src/client/src/components/__tests__/SearchFilterBar.test.tsx', content);
