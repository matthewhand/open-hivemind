import 'reflect-metadata';
import { DatabaseManager } from '../src/database/DatabaseManager';
import { encryptionService } from '../src/database/EncryptionService';
import Debug from 'debug';

const debug = Debug('app:tools:security');

/**
 * ⚠️ WARNING: DATABASE SECURITY & MAINTENANCE TOOL
 * 
 * This script performs sensitive database operations including:
 * 1. Re-encryption: Migrating plain-text credentials to encrypted format.
 * 2. Nuke: Wiping all data from the database.
 * 
 * USAGE:
 *   node --import tsx scripts/db-security-tool.ts [FLAGS]
 */

const args = process.argv.slice(2);
const RE_ENCRYPT = args.includes('--re-encrypt');
const NUKE = args.includes('--nuke');
const CONFIRMED = args.includes('--confirm-i-understand-this-is-destructive');

async function run() {
  console.log('\n=================================================');
  console.log('   🛡️  OPEN-HIVEMIND DATABASE SECURITY TOOL');
  console.log('=================================================\n');

  if (!CONFIRMED) {
    console.error('❌ ERROR: Safety flag missing.');
    console.log('\nTo use this tool, you MUST include the confirmation flag:');
    console.log('  --confirm-i-understand-this-is-destructive\n');
    console.log('Available Commands:');
    console.log('  --re-encrypt : Encrypts all legacy plain-text credentials.');
    console.log('  --nuke       : Wipes ALL data from the database.\n');
    process.exit(1);
  }

  const dbManager = DatabaseManager.getInstance();
  await dbManager.connect();

  if (RE_ENCRYPT) {
    console.log('🚀 Starting Re-Encryption Scrub...');
    try {
      const bots = await dbManager.getAllBotConfigurations();
      let count = 0;

      for (const bot of bots) {
        console.log(`Processing bot: ${bot.name}...`);
        // The repository automatically encrypts on save
        await dbManager.updateBotConfiguration(bot.id!, bot);
        count++;
      }
      
      console.log(`\n✅ SUCCESS: ${count} bots processed and encrypted.`);
    } catch (e) {
      console.error('❌ Re-encryption failed:', e);
    }
  }

  if (NUKE) {
    console.log('☢️  WARNING: NUKING DATABASE...');
    try {
      // @ts-ignore
      const db = dbManager.db;
      const tables = [
        'messages', 'logs', 'bot_configurations', 'bot_configuration_versions', 
        'bot_configuration_audit', 'activity_logs', 'inference_logs', 'memories',
        'audits', 'anomalies', 'approval_requests', 'ai_feedback', 'decisions'
      ];

      for (const table of tables) {
        console.log(`Clearing ${table}...`);
        await db.run(`DELETE FROM ${table}`);
      }
      
      console.log('\n✅ SUCCESS: Database has been wiped clean.');
    } catch (e) {
      console.error('❌ Nuke failed:', e);
    }
  }

  await dbManager.disconnect();
  console.log('\nDone.');
}

run();
