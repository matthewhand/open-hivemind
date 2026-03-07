import fs from 'fs';
import path from 'path';

const configDir = path.join(process.cwd(), 'config');
const providersDir = path.join(configDir, 'providers');

const migrateFile = (filePath: string) => {
    try {
        if (!fs.existsSync(filePath)) return;

        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);
        let modified = false;

        // Remove legacy messageProfile from root
        if (data.messageProfile !== undefined) {
            delete data.messageProfile;
            modified = true;
            console.log(`Removed messageProfile from ${path.basename(filePath)}`);
        }

        // Checking for bots array (common in default.json or similar)
        if (Array.isArray(data.bots)) {
            data.bots.forEach((bot: any) => {
                if (bot.messageProfile !== undefined) {
                    delete bot.messageProfile;
                    modified = true;
                    console.log(`Removed messageProfile from bot ${bot.name} in ${path.basename(filePath)}`);
                }
            });
        }

        if (modified) {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            console.log(`Saved updates to ${filePath}`);
        }
    } catch (error) {
        console.error(`Error migrating ${filePath}:`, error);
    }
};

const runMigration = () => {
    console.log('Starting Config Migration (v2)...');

    // 1. Scan config root
    const rootFiles = fs.readdirSync(configDir).filter(f => f.endsWith('.json'));
    rootFiles.forEach(f => migrateFile(path.join(configDir, f)));

    // 2. Scan providers dir
    if (fs.existsSync(providersDir)) {
        const providerFiles = fs.readdirSync(providersDir).filter(f => f.endsWith('.json'));
        providerFiles.forEach(f => migrateFile(path.join(providersDir, f)));
    }

    console.log('Migration complete.');
};

runMigration();
