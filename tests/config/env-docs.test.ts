import fs from 'fs';
import path from 'path';
import { generateMarkdownDocumentation } from '../../scripts/generate-env-docs';

describe('Environment Variable Documentation Completeness', () => {
  it('docs/ENVIRONMENT_VARIABLES.md should match the actual codebase config schemas', () => {
    const docsPath = path.join(process.cwd(), 'docs', 'ENVIRONMENT_VARIABLES.md');

    // Generate the expected markdown string from the current codebase state
    const expectedMarkdown = generateMarkdownDocumentation();

    // Read the existing file
    let actualMarkdown = '';
    try {
      actualMarkdown = fs.readFileSync(docsPath, 'utf8');
    } catch (e) {
      throw new Error(`docs/ENVIRONMENT_VARIABLES.md does not exist. Run 'pnpm run docs:env' to generate it.`);
    }

    if (actualMarkdown !== expectedMarkdown) {
      // If it doesn't match, write the updated version so developer can just commit
      fs.writeFileSync(docsPath, expectedMarkdown, 'utf8');
      throw new Error(`docs/ENVIRONMENT_VARIABLES.md was out of date. It has been automatically updated. Please commit the changes.`);
    }
  });
});
