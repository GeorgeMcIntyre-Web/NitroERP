import knex from 'knex';
import databaseConfig from '../config/database';
import { logger } from '../utils/logger';

const dbLogger = logger.child({ module: 'database' });

let db: knex.Knex | undefined;

/**
 * Initialize database connection
 */
export const initializeDatabase = async (): Promise<void> => {
  try {
    const environment = process.env.NODE_ENV || 'development';
    const config = databaseConfig[environment];

    if (!config) {
      throw new Error(`Database configuration not found for environment: ${environment}`);
    }

    db = knex(config);

    // Test the connection
    await db.raw('SELECT 1');
    
    const connection = config.connection as any;
    dbLogger.info('Database connection established successfully', {
      environment,
      host: connection?.host,
      database: connection?.database,
    });

    // Set up connection event handlers
    db.on('query', (query) => {
      dbLogger.debug('Database query executed', {
        sql: query.sql,
        bindings: query.bindings,
        duration: query.duration,
      });
    });

    db.on('query-error', (error, query) => {
      dbLogger.error('Database query error', {
        error: error.message,
        sql: query.sql,
        bindings: query.bindings,
      });
    });

  } catch (error) {
    dbLogger.error('Failed to initialize database connection', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
};

/**
 * Get database instance
 */
export const getDatabase = (): knex.Knex => {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
};

/**
 * Close database connection
 */
export const closeDatabase = async (): Promise<void> => {
  try {
    if (db) {
      await db.destroy();
      dbLogger.info('Database connection closed successfully');
    }
  } catch (error) {
    dbLogger.error('Error closing database connection', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
};

/**
 * Run database migrations
 */
export const runMigrations = async (): Promise<void> => {
  try {
    const database = getDatabase();
    const [batchNo, log] = await database.migrate.latest();
    
    dbLogger.info('Database migrations completed', {
      batchNo,
      migrations: log,
    });
  } catch (error) {
    dbLogger.error('Failed to run database migrations', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
};

/**
 * Run database seeds
 */
export const runSeeds = async (): Promise<void> => {
  try {
    const database = getDatabase();
    const result = await database.seed.run();
    
    dbLogger.info('Database seeds completed', {
      result,
    });
  } catch (error) {
    dbLogger.error('Failed to run database seeds', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
};

/**
 * Check database health
 */
export const checkDatabaseHealth = async (): Promise<boolean> => {
  try {
    const database = getDatabase();
    await database.raw('SELECT 1');
    return true;
  } catch (error) {
    dbLogger.error('Database health check failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
};

/**
 * Get database statistics
 */
export const getDatabaseStats = async (): Promise<any> => {
  try {
    const database = getDatabase();
    
    // Get table counts
    const tables = await database.raw(`
      SELECT 
        schemaname,
        tablename,
        n_tup_ins as inserts,
        n_tup_upd as updates,
        n_tup_del as deletes,
        n_live_tup as live_rows,
        n_dead_tup as dead_rows
      FROM pg_stat_user_tables
      ORDER BY n_live_tup DESC
    `);

    // Get connection info
    const connections = await database.raw(`
      SELECT 
        count(*) as total_connections,
        count(*) FILTER (WHERE state = 'active') as active_connections,
        count(*) FILTER (WHERE state = 'idle') as idle_connections
      FROM pg_stat_activity
      WHERE datname = current_database()
    `);

    return {
      tables: tables.rows,
      connections: connections.rows[0],
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    dbLogger.error('Failed to get database statistics', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
};

/**
 * Transaction wrapper with automatic rollback on error
 */
export const withTransaction = async <T>(
  callback: (trx: knex.Knex.Transaction) => Promise<T>
): Promise<T> => {
  const database = getDatabase();
  
  return database.transaction(async (trx) => {
    try {
      const result = await callback(trx);
      return result;
    } catch (error) {
      dbLogger.error('Transaction failed, rolling back', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  });
};

/**
 * Batch insert with chunking for large datasets
 */
export const batchInsert = async <T>(
  table: string,
  data: T[],
  chunkSize: number = 1000
): Promise<void> => {
  const database = getDatabase();
  
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);
    await database(table).insert(chunk);
  }
};

/**
 * Soft delete helper
 */
export const softDelete = async (
  table: string,
  id: string | number,
  deletedBy?: string
): Promise<number> => {
  const database = getDatabase();
  
  const updateData: any = {
    deleted_at: new Date(),
    updated_at: new Date(),
  };

  if (deletedBy) {
    updateData.deleted_by = deletedBy;
  }

  return database(table)
    .where('id', id)
    .whereNull('deleted_at')
    .update(updateData);
};

/**
 * Soft delete query modifier
 */
export const withoutDeleted = (query: knex.Knex.QueryBuilder): knex.Knex.QueryBuilder => {
  return query.whereNull('deleted_at');
};

/**
 * With deleted query modifier (includes soft deleted records)
 */
export const withDeleted = (query: knex.Knex.QueryBuilder): knex.Knex.QueryBuilder => {
  return query;
};

/**
 * Only deleted query modifier (only soft deleted records)
 */
export const onlyDeleted = (query: knex.Knex.QueryBuilder): knex.Knex.QueryBuilder => {
  return query.whereNotNull('deleted_at');
};

export default db; 