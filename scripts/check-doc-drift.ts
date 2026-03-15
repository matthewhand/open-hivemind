#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';

/**
 * Script to detect documentation drift.
 * - Compares config keys in `.env.sample` with mentions in `README.md`.
 * - Validates backend routes exist in API documentation (if applicable).
 */

const ROOT_DIR = path.join(__dirname, '..');
const README_PATH = path.join(ROOT_DIR, 'README.md');
const ENV_SAMPLE_PATH = path.join(ROOT_DIR, '.env.sample');
const SERVER_ROUTES_DIR = path.join(ROOT_DIR, 'src', 'server', 'routes');

function getDocsContent(dir: string): string {
    let content = '';
    if (!fs.existsSync(dir)) return content;

    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            content += getDocsContent(fullPath) + '\n';
        } else if (file.endsWith('.md')) {
            content += fs.readFileSync(fullPath, 'utf-8') + '\n';
        }
    }
    return content;
}

function findApiRoutes(dir: string): string[] {
    const routes: string[] = [];
    if (!fs.existsSync(dir)) return routes;

    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            routes.push(...findApiRoutes(fullPath));
        } else if (file.endsWith('.ts') || file.endsWith('.js')) {
            const content = fs.readFileSync(fullPath, 'utf-8');
            // Match router.get('/api/...', router.post('/api/...', etc
            const regex = /router\.(get|post|put|delete|patch)\(['"`](\/api\/[^'"`]+)['"`]/g;
            let match;
            while ((match = regex.exec(content)) !== null) {
                routes.push(match[2]);
            }
        }
    }
    return routes;
}

function main() {
    console.log('🔍 Checking for documentation drift...');

    const readmeContent = fs.readFileSync(README_PATH, 'utf-8');
    const envSampleContent = fs.readFileSync(ENV_SAMPLE_PATH, 'utf-8');

    const configSectionMatch = readmeContent.match(/## Security & Environment Configuration[\s\S]*/);
    const readmeConfigSection = configSectionMatch ? configSectionMatch[0] : '';

    // Extract required keys from .env.sample (ignoring comments and empty lines)
    const envLines = envSampleContent.split('\n');
    const expectedKeys: string[] = [];

    for (const line of envLines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
            const parts = trimmed.split('=');
            if (parts.length > 0) {
                const key = parts[0].replace('export ', '').trim();
                if (key && !key.startsWith('BOTS_')) { // Ignore dynamic bot keys
                    expectedKeys.push(key);
                }
            }
        }
    }

    let hasErrors = false;

    console.log('Checking configuration keys from .env.sample against README.md...');
    for (const key of expectedKeys) {
        if (!readmeConfigSection.includes(`\`${key}\``) && !readmeConfigSection.includes(key)) {
            console.error(`❌ Drift detected: Configuration key '${key}' from .env.sample is missing from README.md 'Security & Environment Configuration' section.`);
            hasErrors = true;
        }
    }

    // API Route checking logic
    console.log('Checking API routes documentation...');
    // We expect API routes to be documented either in README.md or docs/
    const docsContent = getDocsContent(path.join(ROOT_DIR, 'docs'));
    const allDocsContent = readmeContent + '\\n' + docsContent;

    const routes = findApiRoutes(SERVER_ROUTES_DIR);

    // Only check routes that have the word 'api' in them
    const apiRoutes = routes.filter(r => r.includes('/api/'));

    for (const route of apiRoutes) {
        // Strip variables from route like :id
        const cleanRoute = route.replace(/:[a-zA-Z]+/g, '').replace(/\/$/, '');

        // We just do a very permissive check if some part of the route is mentioned
        // As true parsing would require a swagger/openapi spec
        const routeParts = cleanRoute.split('/').filter(p => p.length > 0 && p !== 'api');

        if (routeParts.length > 0) {
            const significantPart = routeParts[0];
            if (!allDocsContent.includes(significantPart) && !allDocsContent.includes(cleanRoute)) {
                // Warning rather than error for now, as not all minor routes need documenting
                console.warn(`⚠️ Minor drift: API route '${route}' might not be documented.`);
            }
        }
    }

    if (hasErrors) {
        console.error('❌ Documentation drift check failed.');
        process.exit(1);
    } else {
        console.log('✅ Documentation drift check passed.');
        process.exit(0);
    }
}

main();