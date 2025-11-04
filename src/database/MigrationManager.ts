import { Logger } from '@common/logger';

export interface Migration {
  id: string;
  name: string;
  up: (db: any) => Promise<void>;
  down?: (db: any) => Promise<void>;
  version: number;
}

export class MigrationManager {
  private migrations: Migration[] = [];
  private executedMigrations: Set<string> = new Set();
  private db: any;

  constructor(db: any) {
    this.db = db;
    this.loadMigrations();
  }

  private loadMigrations(): void {
    // Define all migrations here
    this.migrations = [
      {
        id: '001_add_tenant_support',
        name: 'Add tenant support to existing tables',
        version: 1,
        up: async (db: any) => {
          // Add tenantId columns to existing tables
          await db.exec(`ALTER TABLE bot_configurations ADD COLUMN tenantId TEXT`);
          await db.exec(`ALTER TABLE bot_configuration_versions ADD COLUMN tenantId TEXT`);
          await db.exec(`ALTER TABLE bot_configuration_audit ADD COLUMN tenantId TEXT`);
          await db.exec(`ALTER TABLE messages ADD COLUMN tenantId TEXT`);
          await db.exec(`ALTER TABLE bot_sessions ADD COLUMN tenantId TEXT`);
          await db.exec(`ALTER TABLE bot_metrics ADD COLUMN tenantId TEXT`);

          // Add indexes for tenantId
          await db.exec(`CREATE INDEX IF NOT EXISTS idx_bot_configurations_tenant ON bot_configurations(tenantId)`);
          await db.exec(`CREATE INDEX IF NOT EXISTS idx_messages_tenant ON messages(tenantId)`);
          await db.exec(`CREATE INDEX IF NOT EXISTS idx_bot_sessions_tenant ON bot_sessions(tenantId)`);
          await db.exec(`CREATE INDEX IF NOT EXISTS idx_bot_metrics_tenant ON bot_metrics(tenantId)`);
          await db.exec(`CREATE INDEX IF NOT EXISTS idx_bot_configuration_versions_tenant ON bot_configuration_versions(tenantId)`);
          await db.exec(`CREATE INDEX IF NOT EXISTS idx_bot_configuration_audit_tenant ON bot_configuration_audit(tenantId)`);
        }
      },
      {
        id: '002_add_rbac_enhancements',
        name: 'Add RBAC enhancements to roles table',
        version: 2,
        up: async (db: any) => {
          await db.exec(`ALTER TABLE roles ADD COLUMN description TEXT`);
          await db.exec(`ALTER TABLE roles ADD COLUMN level INTEGER DEFAULT 0`);
          await db.exec(`ALTER TABLE roles ADD COLUMN isActive BOOLEAN DEFAULT 1`);
          await db.exec(`ALTER TABLE roles ADD COLUMN createdAt DATETIME DEFAULT CURRENT_TIMESTAMP`);
          await db.exec(`ALTER TABLE roles ADD COLUMN updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP`);

          // Add indexes for role enhancements
          await db.exec(`CREATE INDEX IF NOT EXISTS idx_roles_tenant ON roles(tenantId)`);
          await db.exec(`CREATE INDEX IF NOT EXISTS idx_roles_level ON roles(level)`);
        }
      },
      {
        id: '003_add_user_indexes',
        name: 'Add user indexes',
        version: 3,
        up: async (db: any) => {
          await db.exec(`CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenantId)`);
          await db.exec(`CREATE INDEX IF NOT EXISTS idx_audits_tenant ON audits(tenantId)`);
          await db.exec(`CREATE INDEX IF NOT EXISTS idx_audits_user ON audits(userId)`);
        }
      },
      {
        id: '004_add_anomaly_tracking',
        name: 'Add anomaly tracking tables',
        version: 4,
        up: async (db: any) => {
          await db.exec(`
            CREATE TABLE IF NOT EXISTS anomaly_detection (
              id TEXT PRIMARY KEY,
              timestamp DATETIME NOT NULL,
              metric TEXT NOT NULL,
              value REAL NOT NULL,
              expectedMean REAL NOT NULL,
              standardDeviation REAL NOT NULL,
              zScore REAL NOT NULL,
              threshold REAL NOT NULL,
              severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
              explanation TEXT NOT NULL,
              resolved BOOLEAN DEFAULT 0,
              tenantId TEXT,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE
            )
          `);

          // Add indexes for anomaly detection
          await db.exec(`CREATE INDEX IF NOT EXISTS idx_anomaly_detection_timestamp ON anomaly_detection(timestamp DESC)`);
          await db.exec(`CREATE INDEX IF NOT EXISTS idx_anomaly_detection_metric ON anomaly_detection(metric)`);
          await db.exec(`CREATE INDEX IF NOT EXISTS idx_anomaly_detection_severity ON anomaly_detection(severity)`);
          await db.exec(`CREATE INDEX IF NOT EXISTS idx_anomaly_detection_resolved ON anomaly_detection(resolved)`);
          await db.exec(`CREATE INDEX IF NOT EXISTS idx_anomaly_detection_tenant ON anomaly_detection(tenantId)`);
        }
      },
      {
        id: '005_add_monitoring_support',
        name: 'Add monitoring and health check support',
        version: 5,
        up: async (db: any) => {
          await db.exec(`
            CREATE TABLE IF NOT EXISTS health_checks (
              id TEXT PRIMARY KEY,
              component TEXT NOT NULL,
              status TEXT NOT NULL,
              responseTime INTEGER,
              timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
              metadata TEXT,
              tenantId TEXT,
              FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE
            )
          `);

          await db.exec(`
            CREATE TABLE IF NOT EXISTS system_metrics (
              id TEXT PRIMARY KEY,
              metricName TEXT NOT NULL,
              metricValue REAL NOT NULL,
              metricType TEXT NOT NULL,
              timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
              tenantId TEXT,
              FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE
            )
          `);

          // Add indexes for monitoring
          await db.exec(`CREATE INDEX IF NOT EXISTS idx_health_checks_component ON health_checks(component)`);
          await db.exec(`CREATE INDEX IF NOT EXISTS idx_health_checks_status ON health_checks(status)`);
          await db.exec(`CREATE INDEX IF NOT EXISTS idx_health_checks_timestamp ON health_checks(timestamp)`);
          await db.exec(`CREATE INDEX IF NOT EXISTS idx_system_metrics_name ON system_metrics(metricName)`);
          await db.exec(`CREATE INDEX IF NOT EXISTS idx_system_metrics_type ON system_metrics(metricType)`);
        }
      },
      {
        id: '006_add_audit_enhancements',
        name: 'Add audit log enhancements',
        version: 6,
        up: async (db: any) => {
          await db.exec(`ALTER TABLE audits ADD COLUMN resourceId TEXT`);
          await db.exec(`ALTER TABLE audits ADD COLUMN ipAddress TEXT`);
          await db.exec(`ALTER TABLE audits ADD COLUMN userAgent TEXT`);
          await db.exec(`ALTER TABLE audits ADD COLUMN severity TEXT DEFAULT 'info'`);
          await db.exec(`ALTER TABLE audits ADD COLUMN status TEXT DEFAULT 'success'`);
          await db.exec(`ALTER TABLE audits ADD COLUMN details TEXT`);
          await db.exec(`ALTER TABLE audits ADD COLUMN metadata TEXT`);

          // Add indexes for audit enhancements
          await db.exec(`CREATE INDEX IF NOT EXISTS idx_audits_action ON audits(action)`);
          await db.exec(`CREATE INDEX IF NOT EXISTS idx_audits_resource ON audits(resource)`);
          await db.exec(`CREATE INDEX IF NOT EXISTS idx_audits_severity ON audits(severity)`);
          await db.exec(`CREATE INDEX IF NOT EXISTS idx_audits_status ON audits(status)`);
        }
      },
      {
        id: '007_add_notifications',
        name: 'Add notification system',
        version: 7,
        up: async (db: any) => {
          await db.exec(`
            CREATE TABLE IF NOT EXISTS notifications (
              id TEXT PRIMARY KEY,
              userId INTEGER NOT NULL,
              tenantId TEXT NOT NULL,
              type TEXT NOT NULL,
              title TEXT NOT NULL,
              message TEXT NOT NULL,
              isRead BOOLEAN DEFAULT 0,
              createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
              metadata TEXT,
              FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
              FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE
            )
          `);

          await db.exec(`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(userId)`);
          await db.exec(`CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON notifications(tenantId)`);
          await db.exec(`CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(isRead)`);
        }
      },
      {
        id: '008_add_caching_support',
        name: 'Add caching system support',
        version: 8,
        up: async (db: any) => {
          await db.exec(`
            CREATE TABLE IF NOT EXISTS cache_entries (
              key TEXT PRIMARY KEY,
              value TEXT NOT NULL,
              expiresAt DATETIME,
              createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
              tenantId TEXT,
              FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE
            )
          `);

          await db.exec(`CREATE INDEX IF NOT EXISTS idx_cache_expires ON cache_entries(expiresAt)`);
          await db.exec(`CREATE INDEX IF NOT EXISTS idx_cache_tenant ON cache_entries(tenantId)`);
        }
      },
      {
        id: '009_add_job_queue',
        name: 'Add job queue system',
        version: 9,
        up: async (db: any) => {
          await db.exec(`
            CREATE TABLE IF NOT EXISTS job_queue (
              id TEXT PRIMARY KEY,
              jobType TEXT NOT NULL,
              data TEXT NOT NULL,
              status TEXT DEFAULT 'pending',
              priority INTEGER DEFAULT 0,
              createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
              startedAt DATETIME,
              completedAt DATETIME,
              error TEXT,
              retryCount INTEGER DEFAULT 0,
              maxRetries INTEGER DEFAULT 3,
              tenantId TEXT,
              FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE
            )
          `);

          await db.exec(`CREATE INDEX IF NOT EXISTS idx_job_queue_status ON job_queue(status)`);
          await db.exec(`CREATE INDEX IF NOT EXISTS idx_job_queue_priority ON job_queue(priority)`);
          await db.exec(`CREATE INDEX IF NOT EXISTS idx_job_queue_tenant ON job_queue(tenantId)`);
          await db.exec(`CREATE INDEX IF NOT EXISTS idx_job_queue_created ON job_queue(createdAt)`);
        }
      },
      {
        id: '010_add_event_streaming',
        name: 'Add event streaming support',
        version: 10,
        up: async (db: any) => {
          await db.exec(`
            CREATE TABLE IF NOT EXISTS event_stream (
              id TEXT PRIMARY KEY,
              eventType TEXT NOT NULL,
              eventData TEXT NOT NULL,
              source TEXT,
              tenantId TEXT,
              timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE
            )
          `);

          await db.exec(`CREATE INDEX IF NOT EXISTS idx_event_stream_type ON event_stream(eventType)`);
          await db.exec(`CREATE INDEX IF NOT EXISTS idx_event_stream_tenant ON event_stream(tenantId)`);
          await db.exec(`CREATE INDEX IF NOT EXISTS idx_event_stream_timestamp ON event_stream(timestamp)`);
        }
      }
    ];
  }

  async createMigrationsTable(): Promise<void> {
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        version INTEGER NOT NULL UNIQUE,
        executedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        checksum TEXT
      )
    `);
  }

  async getExecutedMigrations(): Promise<string[]> {
    const rows = await this.db.all('SELECT id FROM migrations ORDER BY version');
    return rows.map((row: any) => row.id);
  }

  async runMigrations(): Promise<void> {
    try {
      await this.createMigrationsTable();
      this.executedMigrations = new Set(await this.getExecutedMigrations());

      const pendingMigrations = this.migrations
        .filter(migration => !this.executedMigrations.has(migration.id))
        .sort((a, b) => a.version - b.version);

      for (const migration of pendingMigrations) {
        await this.executeMigration(migration);
      }

      Logger.info(`Executed ${pendingMigrations.length} pending migrations`);
    } catch (error) {
      Logger.error('Error running migrations:', error);
      throw error;
    }
  }

  private async executeMigration(migration: Migration): Promise<void> {
    try {
      Logger.info(`Executing migration ${migration.id}: ${migration.name}`);

      // Start transaction
      await this.db.exec('BEGIN TRANSACTION');

      // Execute migration
      await migration.up(this.db);

      // Record migration in migrations table
      await this.db.run(
        'INSERT INTO migrations (id, name, version) VALUES (?, ?, ?)',
        [migration.id, migration.name, migration.version]
      );

      // Commit transaction
      await this.db.exec('COMMIT');

      Logger.info(`Successfully executed migration ${migration.id}`);
    } catch (error) {
      // Rollback on error
      try {
        await this.db.exec('ROLLBACK');
      } catch (rollbackError) {
        Logger.error('Error rolling back migration:', rollbackError);
      }

      Logger.error(`Failed to execute migration ${migration.id}:`, error);
      throw error;
    }
  }

  async rollbackToVersion(version: number): Promise<void> {
    const migrationsToRollback = this.migrations
      .filter(m => m.version > version)
      .sort((a, b) => b.version - a.version); // Reverse order

    for (const migration of migrationsToRollback) {
      if (migration.down) {
        await this.rollbackMigration(migration);
      }
    }
  }

  private async rollbackMigration(migration: Migration): Promise<void> {
    try {
      Logger.info(`Rolling back migration ${migration.id}: ${migration.name}`);

      // Start transaction
      await this.db.exec('BEGIN TRANSACTION');

      // Execute rollback
      await migration.down!(this.db);

      // Remove from migrations table
      await this.db.run('DELETE FROM migrations WHERE id = ?', [migration.id]);

      // Commit transaction
      await this.db.exec('COMMIT');

      Logger.info(`Successfully rolled back migration ${migration.id}`);
    } catch (error) {
      // Rollback on error
      try {
        await this.db.exec('ROLLBACK');
      } catch (rollbackError) {
        Logger.error('Error rolling back migration:', rollbackError);
      }

      Logger.error(`Failed to roll back migration ${migration.id}:`, error);
      throw error;
    }
  }

  getMigrationsStatus(): { executed: Migration[]; pending: Migration[] } {
    const executed = this.migrations.filter(m => this.executedMigrations.has(m.id));
    const pending = this.migrations.filter(m => !this.executedMigrations.has(m.id));
    
    return { executed, pending };
  }
}