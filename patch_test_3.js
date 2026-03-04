const fs = require('fs');
let content = fs.readFileSync('src/client/src/components/__tests__/SearchFilterBar.test.tsx', 'utf8');

content = content.replace("expect(screen.getByLabelText('Remove category filter')).toBeInTheDocument();",
"expect(screen.getByRole('button', { name: /Active filter: category General/ })).toBeInTheDocument();");

content = content.replace("const clearButton = screen.getByLabelText('Remove category filter');",
"const clearButton = screen.getByRole('button', { name: /Active filter: category General/ });");

fs.writeFileSync('src/client/src/components/__tests__/SearchFilterBar.test.tsx', content);
