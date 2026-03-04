const fs = require('fs');
let content = fs.readFileSync('src/client/src/components/__tests__/SearchFilterBar.test.tsx', 'utf8');

content = content.replace("import { act } from '@testing-library/react';", "");
content = content.replace("import { render, screen, fireEvent } from '@testing-library/react';", "import { render, screen, fireEvent, act } from '@testing-library/react';");

fs.writeFileSync('src/client/src/components/__tests__/SearchFilterBar.test.tsx', content);
