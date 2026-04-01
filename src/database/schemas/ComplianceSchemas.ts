import type { Database } from 'sqlite';
import { Logger } from '@common/logger';
import { type ISchemaModule } from './ISchemaModule';

/**
 * Compliance tables: bot_data_retention_policies, bot_privacy_compliance,
 * bot_consent_management, bot_data_portability_requests,
 * bot_automated_testing, bot_test_results, bot_experiment_tracking
 */
export class ComplianceSchemas implements ISchemaModule {
  async createTables(db: Database): Promise<void> {
    // Bot data retention policies table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_data_retention_policies (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        data_type TEXT NOT NULL,
        retention_period_days INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );

    // Bot privacy compliance table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_privacy_compliance (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        compliance_type TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        details TEXT,
        completed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );

    // Bot consent management table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_consent_management (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        consent_type TEXT NOT NULL,
        granted BOOLEAN DEFAULT 0,
        granted_at DATETIME,
        revoked_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );

    // Bot data portability requests table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_data_portability_requests (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        request_type TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        file_path TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );

    // Bot automated testing table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_automated_testing (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        test_name TEXT NOT NULL,
        test_definition TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        last_run DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );

    // Bot test results table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_test_results (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        test_id TEXT NOT NULL,
        result_data TEXT NOT NULL,
        status TEXT NOT NULL,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE,
        FOREIGN KEY (test_id) REFERENCES bot_automated_testing (id) ON DELETE CASCADE
      )
    `
    );

    // Bot experiment tracking table
    await this.createTable(
      db,
      `
      CREATE TABLE IF NOT EXISTS bot_experiment_tracking (
        id TEXT PRIMARY KEY,
        bot_id TEXT NOT NULL,
        experiment_name TEXT NOT NULL,
        variant_name TEXT NOT NULL,
        result_data TEXT,
        status TEXT DEFAULT 'active',
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        FOREIGN KEY (bot_id) REFERENCES bots (id) ON DELETE CASCADE
      )
    `
    );
  }

  async createIndexes(db: Database): Promise<void> {
    const indexes = [
      // Bot data retention policies indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_data_retention_policies_bot_id ON bot_data_retention_policies(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_data_retention_policies_data_type ON bot_data_retention_policies(data_type)',

      // Bot privacy compliance indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_privacy_compliance_bot_id ON bot_privacy_compliance(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_privacy_compliance_compliance_type ON bot_privacy_compliance(compliance_type)',

      // Bot consent management indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_consent_management_bot_id ON bot_consent_management(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_consent_management_user_id ON bot_consent_management(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_consent_management_consent_type ON bot_consent_management(consent_type)',

      // Bot data portability requests indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_data_portability_requests_bot_id ON bot_data_portability_requests(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_data_portability_requests_user_id ON bot_data_portability_requests(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_data_portability_requests_status ON bot_data_portability_requests(status)',

      // Bot automated testing indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_automated_testing_bot_id ON bot_automated_testing(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_automated_testing_test_name ON bot_automated_testing(test_name)',

      // Bot test results indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_test_results_bot_id ON bot_test_results(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_test_results_test_id ON bot_test_results(test_id)',

      // Bot experiment tracking indexes
      'CREATE INDEX IF NOT EXISTS idx_bot_experiment_tracking_bot_id ON bot_experiment_tracking(bot_id)',
      'CREATE INDEX IF NOT EXISTS idx_bot_experiment_tracking_experiment_name ON bot_experiment_tracking(experiment_name)',
      'CREATE INDEX IF NOT EXISTS idx_bot_experiment_tracking_variant_name ON bot_experiment_tracking(variant_name)',
    ];

    for (const indexSql of indexes) {
      await this.createIndex(db, indexSql);
    }
  }

  private async createTable(db: Database, sql: string): Promise<void> {
    try {
      await db.run(sql);
    } catch (err: any) {
      Logger.error(`Error creating table: ${err.message}`);
      throw err;
    }
  }

  private async createIndex(db: Database, sql: string): Promise<void> {
    try {
      await db.run(sql);
    } catch (err: any) {
      Logger.error(`Error creating index: ${err.message}`);
    }
  }
}
