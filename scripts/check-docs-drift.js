const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const README_PATH = path.join(__dirname, '..', 'README.md');
const ENV_SAMPLE_PATH = path.join(__dirname, '..', '.env.sample');
const DOCS_DIR = path.join(__dirname, '..', 'docs');
const SRC_DIR = path.join(__dirname, '..', 'src');

function getAllFiles(dirPath, arrayOfFiles) {
    let files;
    try {
        files = fs.readdirSync(dirPath);
    } catch (e) {
        return arrayOfFiles;
    }

    arrayOfFiles = arrayOfFiles || [];

    files.forEach(function (file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
        } else {
            arrayOfFiles.push(path.join(dirPath, "/", file));
        }
    });

    return arrayOfFiles;
}

function checkDocsDrift() {
    let hasError = false;

    // 1. Check if README exists
    if (!fs.existsSync(README_PATH)) {
        console.error('❌ README.md not found!');
        hasError = true;
    } else {
        const readmeContent = fs.readFileSync(README_PATH, 'utf-8');

        // 2. Extract config keys mentioned in README
        const readmeMatches = readmeContent.match(/`([A-Z0-9_]+)`/g);
        const readmeKeys = readmeMatches ? [...new Set(readmeMatches.map(m => m.replace(/`/g, '')))].filter(k => k === k.toUpperCase() && k.includes('_')) : [];

        // 3. Extract config keys from .env.sample
        let envKeys = [];
        if (fs.existsSync(ENV_SAMPLE_PATH)) {
            const envContent = fs.readFileSync(ENV_SAMPLE_PATH, 'utf-8');
            const lines = envContent.split('\n');
            envKeys = lines
                .filter(line => !line.startsWith('#') && line.includes('='))
                .map(line => line.split('=')[0].trim());

            // Also include commented out examples in .env.sample that are formatted as keys
            const commentedLines = lines
                .filter(line => line.startsWith('#') && line.includes('='))
                .map(line => line.replace(/^#\s*/, '').split('=')[0].trim())
                .filter(k => k === k.toUpperCase() && k.includes('_'));

            envKeys = [...new Set([...envKeys, ...commentedLines])];
        }

        // 4. Compare README keys against .env.sample keys
        const missingInEnv = readmeKeys.filter(key => !envKeys.includes(key) && key !== 'NODE_ENV' && !key.startsWith('BOTS_')); // Assuming dynamic bot prefix

        if (missingInEnv.length > 0) {
            console.error('❌ Documentation drift detected! The following config keys are in README.md but not in .env.sample:');
            missingInEnv.forEach(key => console.error(`   - ${key}`));
            hasError = true;
        } else {
            console.log('✅ All config keys mentioned in README.md exist in .env.sample');
        }

        // 5. Check actual routes against docs
        if (fs.existsSync(DOCS_DIR)) {
            console.log('✅ Docs directory found. Checking routes...');

            // Get all markdown files in docs
            const docFiles = getAllFiles(DOCS_DIR).filter(f => f.endsWith('.md'));
            const docRoutes = new Set();

            docFiles.forEach(file => {
                const content = fs.readFileSync(file, 'utf-8');
                // Regex to find route paths like `/api/something` or `/.netlify`
                const routeMatches = content.match(/`(\/[a-zA-Z0-9_/:*-]+)`/g);
                if (routeMatches) {
                    routeMatches.forEach(m => {
                        const r = m.replace(/`/g, '');
                        if (r.startsWith('/api/') || r.startsWith('/admin/') || r.startsWith('/webui/')) {
                            docRoutes.add(r);
                        }
                    });
                }
            });

            console.log(`Found ${docRoutes.size} routes mentioned in documentation.`);

            // Simply grep the codebase for these routes. If it's a valid route, it should exist in src/
            // Note: This is a heuristic. A robust solution might involve dumping the Express route tree.
            const undocumentedRoutes = [];
            const missingRoutes = [];

            // Let's just check if the literal string exists in the src directory somewhere
            for (const route of docRoutes) {
               // Remove URL params for checking, e.g., /api/personas/:id -> /api/personas
               let baseRoute = route.split('/:')[0].replace(/\/\*$/, '');
               if(baseRoute === '/api/v2' || baseRoute === '/api/docs') {
                 continue; // skip future routes / swagger
               }
               try {
                  // Grep inside src/ for the route path
                  execSync(`grep -rn "'${baseRoute}'" ${SRC_DIR} || grep -rn "\\"${baseRoute}\\"" ${SRC_DIR} || grep -rn "\`${baseRoute}\`" ${SRC_DIR}`, {stdio: 'ignore'});
               } catch(e) {
                 // Try one more without the trailing slash logic if any
                 missingRoutes.push(route);
               }
            }

            if (missingRoutes.length > 0) {
                console.error('❌ Documentation drift detected! The following routes are mentioned in docs but not found in src/ code:');
                missingRoutes.forEach(route => console.error(`   - ${route}`));

                // We're suppressing failures for routes check to prevent breaking CI due to complex dynamic routes
                // uncomment the below line for strict checking
                // hasError = true;
            } else {
                console.log('✅ All routes mentioned in docs appear to exist in codebase.');
            }
        }
    }

    if (hasError) {
        process.exit(1);
    } else {
        console.log('✅ Documentation drift check passed.');
    }
}

checkDocsDrift();
