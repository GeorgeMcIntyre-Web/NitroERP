import knex, { Knex } from 'knex';
import config from '../../knexfile';
import { logger, logDatabaseQuery } from '../utils/logger';

class DatabaseService {
  private static instance: DatabaseService;
  private db: Knex | null = null;

  private constructor() {}

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  public async initialize(): Promise<void> {
    try {
      const environment = process.env.NODE_ENV || 'development';
      this.db = knex(config[environment]);

      // Test the connection
      await this.db.raw('SELECT 1');
      logger.info('Database connection established successfully');

      // Add query logging in development
      if (process.env.NODE_ENV === 'development') {
        this.db.on('query', (query) => {
          const startTime = Date.now();
          query.response = (response: any) => {
            const duration = Date.now() - startTime;
            logDatabaseQuery(query.sql, duration, query.bindings);
            return response;
          };
        });
      }
    } catch (error) {
      logger.error('Failed to initialize database connection:', error);
      throw error;
    }
  }

  public getConnection(): Knex {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  public async close(): Promise<void> {
    if (this.db) {
      await this.db.destroy();
      this.db = null;
      logger.info('Database connection closed');
    }
  }

  // Helper methods for common database operations
  public async transaction<T>(callback: (trx: Knex.Transaction) => Promise<T>): Promise<T> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db.transaction(callback);
  }

  public async healthCheck(): Promise<boolean> {
    try {
      if (!this.db) {
        return false;
      }
      await this.db.raw('SELECT 1');
      return true;
    } catch (error) {
      logger.error('Database health check failed:', error);
      return false;
    }
  }

  // Utility methods for pagination
  public buildPaginationQuery(query: Knex.QueryBuilder, page: number, limit: number) {
    const offset = (page - 1) * limit;
    return query.offset(offset).limit(limit);
  }

  public async getPaginatedResults<T>(
    query: Knex.QueryBuilder,
    page: number,
    limit: number
  ): Promise<{ data: T[]; total: number; totalPages: number }> {
    const countQuery = query.clone();
    const total = await countQuery.count('* as count').first();
    const totalCount = total ? Number(total.count) : 0;
    const totalPages = Math.ceil(totalCount / limit);

    const data = await this.buildPaginationQuery(query, page, limit);

    return {
      data: data as T[],
      total: totalCount,
      totalPages,
    };
  }

  // Search utility
  public buildSearchQuery(
    query: Knex.QueryBuilder,
    searchTerm: string,
    searchableColumns: string[]
  ): Knex.QueryBuilder {
    if (!searchTerm) return query;

    const searchConditions = searchableColumns.map((column) => {
      return query.raw(`CAST(${column} AS TEXT) ILIKE ?`, [`%${searchTerm}%`]);
    });

    return query.where(function () {
      searchConditions.forEach((condition, index) => {
        if (index === 0) {
          this.where(condition);
        } else {
          this.orWhere(condition);
        }
      });
    });
  }

  // Date range utility
  public buildDateRangeQuery(
    query: Knex.QueryBuilder,
    dateColumn: string,
    startDate?: Date,
    endDate?: Date
  ): Knex.QueryBuilder {
    if (startDate) {
      query = query.where(dateColumn, '>=', startDate);
    }
    if (endDate) {
      query = query.where(dateColumn, '<=', endDate);
    }
    return query;
  }

  // Soft delete utility
  public softDelete(table: string, id: string, userId?: string): Knex.QueryBuilder {
    const updateData: any = {
      deleted_at: new Date(),
      deleted_by: userId,
    };

    return this.db!(table).where({ id }).update(updateData);
  }

  // Audit trail utility
  public async createAuditLog(
    table: string,
    recordId: string,
    action: 'create' | 'update' | 'delete',
    userId: string,
    oldData?: any,
    newData?: any
  ): Promise<void> {
    if (!this.db) return;

    await this.db('audit_logs').insert({
      table_name: table,
      record_id: recordId,
      action,
      user_id: userId,
      old_data: oldData ? JSON.stringify(oldData) : null,
      new_data: newData ? JSON.stringify(newData) : null,
      created_at: new Date(),
    });
  }
}

// Export singleton instance
export const databaseService = DatabaseService.getInstance();

// Export the class for testing
export { DatabaseService }; 