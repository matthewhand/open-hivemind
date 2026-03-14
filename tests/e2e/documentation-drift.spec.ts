import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import * as path from 'path';

test.describe('Documentation Drift Check', () => {
    test('check-docs script should execute successfully without errors', async () => {
        // Run the script directly
        let scriptOutput = '';
        let scriptError = null;
        try {
            const scriptPath = path.resolve(__dirname, '../../scripts/check-docs-drift.js');
            scriptOutput = execSync(`node ${scriptPath}`).toString();
        } catch (error) {
            scriptError = error;
        }

        // We expect the script to pass cleanly and not throw an error (which means process exit code 0)
        expect(scriptError).toBeNull();
        expect(scriptOutput).toContain('Documentation drift check passed');
    });
});
