import { ActivitySchemas } from '../schemas/ActivitySchemas';
import { type IDatabase } from '../types';

export const up = async ({ db, isPostgres }: { db: IDatabase; isPostgres: boolean }) => {
  const pk_auto = isPostgres ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
  const datetime_type = isPostgres ? 'TIMESTAMP' : 'DATETIME';
  const default_now = isPostgres ? 'CURRENT_TIMESTAMP' : 'CURRENT_TIMESTAMP';

  if (isPostgres) {
    try {
      await db.exec('CREATE EXTENSION IF NOT EXISTS vector');
    } catch (e) {
      console.warn(
        'Failed to enable pgvector extension (might already exist or permission denied):',
        e
      );
    }
  }

  // Core Tables
  await db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id ${pk_auto},
      messageId TEXT NOT NULL,
      channelId TEXT NOT NULL,
      content TEXT NOT NULL,
      authorId TEXT NOT NULL,
      authorName TEXT NOT NULL,
      timestamp ${datetime_type} NOT NULL,
      provider TEXT NOT NULL,
      direction TEXT,
      metadata TEXT,
      tenantId TEXT,
      created_at ${datetime_type} DEFAULT ${default_now}
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS conversation_summaries (
      id ${pk_auto},
      channelId TEXT NOT NULL,
      summary TEXT NOT NULL,
      messageCount INTEGER NOT NULL,
      startTimestamp ${datetime_type} NOT NULL,
      endTimestamp ${datetime_type} NOT NULL,
      provider TEXT NOT NULL,
      created_at ${datetime_type} DEFAULT ${default_now}
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS bot_metrics (
      id ${pk_auto},
      botName TEXT NOT NULL,
      messagesSent INTEGER DEFAULT 0,
      messagesReceived INTEGER DEFAULT 0,
      conversationsHandled INTEGER DEFAULT 0,
      averageResponseTime REAL DEFAULT 0,
      lastActivity ${datetime_type},
      provider TEXT NOT NULL,
      tenantId TEXT,
      created_at ${datetime_type} DEFAULT ${default_now},
      updated_at ${datetime_type} DEFAULT ${default_now}
    )
  `);

  if (isPostgres) {
    try {
      await db.exec(
        'ALTER TABLE bot_metrics ADD CONSTRAINT bot_metrics_name_unique UNIQUE (botName)'
      );
    } catch (e) {}
  }

  await db.exec(`
    CREATE TABLE IF NOT EXISTS bot_sessions (
      id ${pk_auto},
      sessionId TEXT UNIQUE NOT NULL,
      botName TEXT NOT NULL,
      channelId TEXT NOT NULL,
      provider TEXT NOT NULL,
      startTime ${datetime_type} NOT NULL,
      endTime ${datetime_type},
      messageCount INTEGER DEFAULT 0,
      isActive BOOLEAN DEFAULT ${isPostgres ? 'TRUE' : '1'},
      tenantId TEXT,
      created_at ${datetime_type} DEFAULT ${default_now}
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS bot_configurations (
      id ${pk_auto},
      name TEXT UNIQUE NOT NULL,
      messageProvider TEXT NOT NULL,
      llmProvider TEXT NOT NULL,
      persona TEXT,
      systemInstruction TEXT,
      mcpServers TEXT,
      mcpGuard TEXT,
      discord TEXT,
      slack TEXT,
      mattermost TEXT,
      openai TEXT,
      flowise TEXT,
      openwebui TEXT,
      openswarm TEXT,
      tenantId TEXT,
      isActive BOOLEAN DEFAULT ${isPostgres ? 'TRUE' : '1'},
      createdAt ${datetime_type} DEFAULT ${default_now},
      updatedAt ${datetime_type} DEFAULT ${default_now},
      createdBy TEXT,
      updatedBy TEXT
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS bot_configuration_versions (
      id ${pk_auto},
      botConfigurationId INTEGER NOT NULL,
      version TEXT NOT NULL,
      name TEXT NOT NULL,
      messageProvider TEXT NOT NULL,
      llmProvider TEXT NOT NULL,
      persona TEXT,
      systemInstruction TEXT,
      mcpServers TEXT,
      mcpGuard TEXT,
      discord TEXT,
      slack TEXT,
      mattermost TEXT,
      openai TEXT,
      flowise TEXT,
      openwebui TEXT,
      openswarm TEXT,
      tenantId TEXT,
      isActive BOOLEAN DEFAULT ${isPostgres ? 'TRUE' : '1'},
      createdAt ${datetime_type} DEFAULT ${default_now},
      createdBy TEXT,
      changeLog TEXT
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS bot_configuration_audit (
      id ${pk_auto},
      botConfigurationId INTEGER NOT NULL,
      action TEXT NOT NULL,
      oldValues TEXT,
      newValues TEXT,
      performedBy TEXT,
      performedAt ${datetime_type} DEFAULT ${default_now},
      ipAddress TEXT,
      userAgent TEXT,
      tenantId TEXT
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      domain TEXT UNIQUE NOT NULL,
      plan TEXT NOT NULL DEFAULT 'free',
      maxBots INTEGER DEFAULT 5,
      maxUsers INTEGER DEFAULT 3,
      storageQuota INTEGER DEFAULT 1073741824,
      features TEXT,
      isActive BOOLEAN DEFAULT ${isPostgres ? 'TRUE' : '1'},
      createdAt ${datetime_type} DEFAULT ${default_now},
      expiresAt ${datetime_type}
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS roles (
      id ${pk_auto},
      name TEXT NOT NULL,
      description TEXT,
      level INTEGER DEFAULT 0,
      permissions TEXT,
      isActive BOOLEAN DEFAULT ${isPostgres ? 'TRUE' : '1'},
      tenantId TEXT NOT NULL,
      createdAt ${datetime_type} DEFAULT ${default_now},
      updatedAt ${datetime_type} DEFAULT ${default_now}
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id ${pk_auto},
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      passwordHash TEXT NOT NULL,
      roleId INTEGER,
      tenantId TEXT NOT NULL,
      isActive BOOLEAN DEFAULT ${isPostgres ? 'TRUE' : '1'},
      createdAt ${datetime_type} DEFAULT ${default_now},
      lastLogin ${datetime_type}
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS audits (
      id ${pk_auto},
      timestamp ${datetime_type} DEFAULT ${default_now},
      userId INTEGER,
      action TEXT NOT NULL,
      resource TEXT NOT NULL,
      resourceId TEXT,
      tenantId TEXT NOT NULL,
      ipAddress TEXT,
      userAgent TEXT,
      severity TEXT DEFAULT 'info',
      status TEXT DEFAULT 'success',
      details TEXT,
      metadata TEXT
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS approval_requests (
      id ${pk_auto},
      resourceType TEXT NOT NULL,
      resourceId INTEGER NOT NULL,
      changeType TEXT NOT NULL,
      requestedBy TEXT NOT NULL,
      diff TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      reviewedBy TEXT,
      reviewedAt ${datetime_type},
      reviewComments TEXT,
      createdAt ${datetime_type} DEFAULT ${default_now},
      tenantId TEXT
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS anomalies (
      id TEXT PRIMARY KEY,
      timestamp ${datetime_type} NOT NULL,
      metric TEXT NOT NULL,
      value REAL NOT NULL,
      expectedMean REAL NOT NULL,
      standardDeviation REAL NOT NULL,
      zScore REAL NOT NULL,
      threshold REAL NOT NULL,
      severity TEXT NOT NULL,
      explanation TEXT NOT NULL,
      resolved BOOLEAN DEFAULT ${isPostgres ? 'FALSE' : '0'},
      tenantId TEXT,
      created_at ${datetime_type} DEFAULT ${default_now}
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS ai_feedback (
      id ${pk_auto},
      recommendationId TEXT NOT NULL,
      feedback TEXT NOT NULL,
      timestamp ${datetime_type} DEFAULT ${default_now},
      metadata TEXT
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS decisions (
      id ${pk_auto},
      botName TEXT,
      shouldReply BOOLEAN,
      reason TEXT,
      probabilityRoll REAL,
      threshold REAL,
      timestamp TEXT
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS inference_logs (
      id ${pk_auto},
      botName TEXT NOT NULL,
      prompt TEXT NOT NULL,
      response TEXT,
      tokensUsed INTEGER,
      latencyMs INTEGER,
      provider TEXT,
      status TEXT,
      errorMessage TEXT,
      timestamp ${datetime_type} DEFAULT ${default_now}
    )
  `);

  const embedding_col = isPostgres ? 'embedding vector(1536)' : 'embedding TEXT';
  await db.exec(`
    CREATE TABLE IF NOT EXISTS memories (
      id ${isPostgres ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
      content TEXT NOT NULL,
      metadata TEXT,
      userId TEXT,
      agentId TEXT,
      sessionId TEXT,
      ${embedding_col},
      created_at ${datetime_type} DEFAULT ${default_now}
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS logs (
      id ${pk_auto},
      timestamp ${datetime_type} DEFAULT ${default_now},
      level TEXT NOT NULL,
      context TEXT,
      message TEXT NOT NULL,
      details TEXT,
      metadata TEXT
    )
  `);

  // Activity Schemas (legacy import logic safe for migration 0)
  const activitySchemas = new ActivitySchemas();
  await activitySchemas.createTables(db);
  await activitySchemas.createIndexes(db);

  // Indexes
  await db.exec(
    `CREATE INDEX IF NOT EXISTS idx_messages_channel_timestamp ON messages(channelId, timestamp DESC)`
  );
  await db.exec(
    `CREATE INDEX IF NOT EXISTS idx_messages_author ON messages(authorId, timestamp DESC)`
  );
  await db.exec(
    `CREATE INDEX IF NOT EXISTS idx_messages_provider ON messages(provider, timestamp DESC)`
  );
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_bot_metrics_bot ON bot_metrics(botName, provider)`);
  await db.exec(
    `CREATE INDEX IF NOT EXISTS idx_bot_sessions_active ON bot_sessions(isActive, channelId)`
  );
  await db.exec(
    `CREATE INDEX IF NOT EXISTS idx_bot_configurations_name ON bot_configurations(name)`
  );
  await db.exec(
    `CREATE INDEX IF NOT EXISTS idx_bot_configurations_active ON bot_configurations(isActive)`
  );
  await db.exec(
    `CREATE INDEX IF NOT EXISTS idx_bot_configurations_provider ON bot_configurations(messageProvider, llmProvider)`
  );
  await db.exec(
    `CREATE INDEX IF NOT EXISTS idx_bot_configurations_updated_at ON bot_configurations(updatedAt DESC)`
  );
  await db.exec(
    `CREATE INDEX IF NOT EXISTS idx_bot_configuration_versions_config ON bot_configuration_versions(botConfigurationId, version DESC)`
  );
  await db.exec(
    `CREATE INDEX IF NOT EXISTS idx_bot_configuration_versions_created_at ON bot_configuration_versions(createdAt DESC)`
  );
  await db.exec(
    `CREATE INDEX IF NOT EXISTS idx_bot_configuration_audit_config ON bot_configuration_audit(botConfigurationId, performedAt DESC)`
  );
  await db.exec(
    `CREATE INDEX IF NOT EXISTS idx_bot_configuration_audit_performed_at ON bot_configuration_audit(performedAt DESC)`
  );
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp DESC)`);
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level)`);
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_inference_bot ON inference_logs(botName)`);
  await db.exec(
    `CREATE INDEX IF NOT EXISTS idx_inference_timestamp ON inference_logs(timestamp DESC)`
  );
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_memories_user ON memories(userId)`);
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_memories_agent ON memories(agentId)`);

  if (isPostgres) {
    try {
      await db.exec(
        `CREATE INDEX IF NOT EXISTS idx_memories_embedding ON memories USING hnsw (embedding vector_cosine_ops)`
      );
    } catch (e) {
      console.warn('Failed to create HNSW index for vector memory (ignoring):', e);
    }
  }
};
