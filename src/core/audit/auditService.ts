import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../database/connection';
import { logger } from '../../utils/logger';
import { 
  ValidationError 
} from '../../middleware/errorHandler';

export interface AuditLogData {
  user_id: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  company_id?: string;
  department_id?: string;
}

export interface DataAccessLogData {
  user_id: string;
  table_name: string;
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  record_id?: string;
  query?: string;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  company_id?: string;
  department_id?: string;
}

export interface SystemEventData {
  event_type: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  details?: Record<string, any>;
  source?: string;
  user_id?: string;
  company_id?: string;
}

export interface SecurityEventData {
  event_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  user_id?: string;
  session_id?: string;
  company_id?: string;
}

export interface ComplianceLogData {
  compliance_type: string;
  action: string;
  details?: Record<string, any>;
  user_id?: string;
  company_id?: string;
  department_id?: string;
  ip_address?: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  company_id?: string;
  department_id?: string;
  created_at: Date;
}

export interface AuditFilters {
  user_id?: string;
  action?: string;
  resource_type?: string;
  resource_id?: string;
  company_id?: string;
  department_id?: string;
  start_date?: Date;
  end_date?: Date;
  page?: number;
  limit?: number;
}

export class AuditService {
  /**
   * Log user action
   */
  async logUserAction(data: AuditLogData): Promise<void> {
    try {
      const db = getDatabase();
      // Validate input
      this.validateAuditLogData(data);

      // Insert audit log
      await db('audit_logs').insert({
        id: uuidv4(),
        user_id: data.user_id,
        action: data.action,
        resource_type: data.resource_type,
        resource_id: data.resource_id,
        details: data.details ? JSON.stringify(data.details) : null,
        ip_address: data.ip_address,
        user_agent: data.user_agent,
        session_id: data.session_id,
        company_id: data.company_id,
        department_id: data.department_id
      });

      logger.info('Audit log created', {
        userId: data.user_id,
        action: data.action,
        resourceType: data.resource_type,
        resourceId: data.resource_id
      });
    } catch (error) {
      logger.error('Error creating audit log', { error, data });
      // Don't throw error for audit logging failures
    }
  }

  /**
   * Log data access
   */
  async logDataAccess(data: DataAccessLogData): Promise<void> {
    try {
      const db = getDatabase();
      // Validate input
      this.validateDataAccessLogData(data);

      // Insert data access log
      await db('data_access_logs').insert({
        id: uuidv4(),
        user_id: data.user_id,
        table_name: data.table_name,
        operation: data.operation,
        record_id: data.record_id,
        query: data.query,
        ip_address: data.ip_address,
        user_agent: data.user_agent,
        session_id: data.session_id,
        company_id: data.company_id,
        department_id: data.department_id
      });

      logger.info('Data access log created', {
        userId: data.user_id,
        tableName: data.table_name,
        operation: data.operation,
        recordId: data.record_id
      });
    } catch (error) {
      logger.error('Error creating data access log', { error, data });
      // Don't throw error for audit logging failures
    }
  }

  /**
   * Log system event
   */
  async logSystemEvent(data: SystemEventData): Promise<void> {
    try {
      const db = getDatabase();
      // Validate input
      this.validateSystemEventData(data);

      // Insert system event
      await db('system_events').insert({
        id: uuidv4(),
        event_type: data.event_type,
        severity: data.severity,
        message: data.message,
        details: data.details ? JSON.stringify(data.details) : null,
        source: data.source,
        user_id: data.user_id,
        company_id: data.company_id
      });

      logger.info('System event logged', {
        eventType: data.event_type,
        severity: data.severity,
        message: data.message,
        source: data.source
      });
    } catch (error) {
      logger.error('Error logging system event', { error, data });
      // Don't throw error for audit logging failures
    }
  }

  /**
   * Log security event
   */
  async logSecurityEvent(data: SecurityEventData): Promise<void> {
    try {
      const db = getDatabase();
      // Validate input
      this.validateSecurityEventData(data);

      // Insert security event
      await db('security_events').insert({
        id: uuidv4(),
        event_type: data.event_type,
        severity: data.severity,
        message: data.message,
        details: data.details ? JSON.stringify(data.details) : null,
        ip_address: data.ip_address,
        user_agent: data.user_agent,
        user_id: data.user_id,
        session_id: data.session_id,
        company_id: data.company_id
      });

      logger.info('Security event logged', {
        eventType: data.event_type,
        severity: data.severity,
        message: data.message,
        ipAddress: data.ip_address
      });
    } catch (error) {
      logger.error('Error logging security event', { error, data });
      // Don't throw error for audit logging failures
    }
  }

  /**
   * Log compliance event
   */
  async logComplianceEvent(data: ComplianceLogData): Promise<void> {
    try {
      const db = getDatabase();
      // Validate input
      this.validateComplianceLogData(data);

      // Insert compliance log
      await db('compliance_logs').insert({
        id: uuidv4(),
        compliance_type: data.compliance_type,
        action: data.action,
        details: data.details ? JSON.stringify(data.details) : null,
        user_id: data.user_id,
        company_id: data.company_id,
        department_id: data.department_id,
        ip_address: data.ip_address
      });

      logger.info('Compliance log created', {
        complianceType: data.compliance_type,
        action: data.action,
        userId: data.user_id,
        companyId: data.company_id
      });
    } catch (error) {
      logger.error('Error creating compliance log', { error, data });
      // Don't throw error for audit logging failures
    }
  }

  /**
   * Get audit logs with filters
   */
  async getAuditLogs(filters: AuditFilters = {}): Promise<{
    logs: AuditLog[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const db = getDatabase();
      const page = filters.page || 1;
      const limit = Math.min(filters.limit || 50, 200);
      const offset = (page - 1) * limit;

      // Build query
      let query = db('audit_logs');

      // Apply filters
      if (filters.user_id) {
        query = query.where('user_id', filters.user_id);
      }

      if (filters.action) {
        query = query.where('action', filters.action);
      }

      if (filters.resource_type) {
        query = query.where('resource_type', filters.resource_type);
      }

      if (filters.resource_id) {
        query = query.where('resource_id', filters.resource_id);
      }

      if (filters.company_id) {
        query = query.where('company_id', filters.company_id);
      }

      if (filters.department_id) {
        query = query.where('department_id', filters.department_id);
      }

      if (filters.start_date) {
        query = query.where('created_at', '>=', filters.start_date);
      }

      if (filters.end_date) {
        query = query.where('created_at', '<=', filters.end_date);
      }

      // Get total count
      const countQuery = query.clone();
      const [{ count }] = await countQuery.count('* as count');

      // Get paginated results
      const logs = await query
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset);

      // Parse details JSON
      const parsedLogs = logs.map((log: any) => ({
        ...log,
        details: log.details ? JSON.parse(log.details) : undefined
      }));

      return {
        logs: parsedLogs,
        total: parseInt(count as string),
        page,
        limit,
        totalPages: Math.ceil(parseInt(count as string) / limit)
      };
    } catch (error) {
      logger.error('Error fetching audit logs', { error, filters });
      throw error;
    }
  }

  /**
   * Get data access logs
   */
  async getDataAccessLogs(filters: {
    user_id?: string;
    table_name?: string;
    operation?: string;
    company_id?: string;
    start_date?: Date;
    end_date?: Date;
    page?: number;
    limit?: number;
  } = {}): Promise<{
    logs: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const db = getDatabase();
      const page = filters.page || 1;
      const limit = Math.min(filters.limit || 50, 200);
      const offset = (page - 1) * limit;

      // Build query
      let query = db('data_access_logs');

      // Apply filters
      if (filters.user_id) {
        query = query.where('user_id', filters.user_id);
      }

      if (filters.table_name) {
        query = query.where('table_name', filters.table_name);
      }

      if (filters.operation) {
        query = query.where('operation', filters.operation);
      }

      if (filters.company_id) {
        query = query.where('company_id', filters.company_id);
      }

      if (filters.start_date) {
        query = query.where('created_at', '>=', filters.start_date);
      }

      if (filters.end_date) {
        query = query.where('created_at', '<=', filters.end_date);
      }

      // Get total count
      const countQuery = query.clone();
      const [{ count }] = await countQuery.count('* as count');

      // Get paginated results
      const logs = await query
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset);

      return {
        logs,
        total: parseInt(count as string),
        page,
        limit,
        totalPages: Math.ceil(parseInt(count as string) / limit)
      };
    } catch (error) {
      logger.error('Error fetching data access logs', { error, filters });
      throw error;
    }
  }

  /**
   * Get system events
   */
  async getSystemEvents(filters: {
    event_type?: string;
    severity?: string;
    source?: string;
    start_date?: Date;
    end_date?: Date;
    page?: number;
    limit?: number;
  } = {}): Promise<{
    events: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const db = getDatabase();
      const page = filters.page || 1;
      const limit = Math.min(filters.limit || 50, 200);
      const offset = (page - 1) * limit;

      // Build query
      let query = db('system_events');

      // Apply filters
      if (filters.event_type) {
        query = query.where('event_type', filters.event_type);
      }

      if (filters.severity) {
        query = query.where('severity', filters.severity);
      }

      if (filters.source) {
        query = query.where('source', filters.source);
      }

      if (filters.start_date) {
        query = query.where('created_at', '>=', filters.start_date);
      }

      if (filters.end_date) {
        query = query.where('created_at', '<=', filters.end_date);
      }

      // Get total count
      const countQuery = query.clone();
      const [{ count }] = await countQuery.count('* as count');

      // Get paginated results
      const events = await query
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset);

      // Parse details JSON
      const parsedEvents = events.map((event: any) => ({
        ...event,
        details: event.details ? JSON.parse(event.details) : undefined
      }));

      return {
        events: parsedEvents,
        total: parseInt(count as string),
        page,
        limit,
        totalPages: Math.ceil(parseInt(count as string) / limit)
      };
    } catch (error) {
      logger.error('Error fetching system events', { error, filters });
      throw error;
    }
  }

  /**
   * Get security events
   */
  async getSecurityEvents(filters: {
    event_type?: string;
    severity?: string;
    user_id?: string;
    ip_address?: string;
    start_date?: Date;
    end_date?: Date;
    page?: number;
    limit?: number;
  } = {}): Promise<{
    events: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const db = getDatabase();
      const page = filters.page || 1;
      const limit = Math.min(filters.limit || 50, 200);
      const offset = (page - 1) * limit;

      // Build query
      let query = db('security_events');

      // Apply filters
      if (filters.event_type) {
        query = query.where('event_type', filters.event_type);
      }

      if (filters.severity) {
        query = query.where('severity', filters.severity);
      }

      if (filters.user_id) {
        query = query.where('user_id', filters.user_id);
      }

      if (filters.ip_address) {
        query = query.where('ip_address', filters.ip_address);
      }

      if (filters.start_date) {
        query = query.where('created_at', '>=', filters.start_date);
      }

      if (filters.end_date) {
        query = query.where('created_at', '<=', filters.end_date);
      }

      // Get total count
      const countQuery = query.clone();
      const [{ count }] = await countQuery.count('* as count');

      // Get paginated results
      const events = await query
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset);

      // Parse details JSON
      const parsedEvents = events.map(event => ({
        ...event,
        details: event.details ? JSON.parse(event.details) : undefined
      }));

      return {
        events: parsedEvents,
        total: parseInt(count as string),
        page,
        limit,
        totalPages: Math.ceil(parseInt(count as string) / limit)
      };
    } catch (error) {
      logger.error('Error fetching security events', { error, filters });
      throw error;
    }
  }

  /**
   * Generate audit report
   */
  async generateAuditReport(filters: {
    company_id?: string;
    department_id?: string;
    start_date: Date;
    end_date: Date;
    report_type: 'summary' | 'detailed' | 'compliance';
  }): Promise<any> {
    try {
      const db = getDatabase();
      const { company_id, department_id, start_date, end_date, report_type } = filters;

      let baseQuery = db('audit_logs')
        .where('created_at', '>=', start_date)
        .where('created_at', '<=', end_date);

      if (company_id) {
        baseQuery = baseQuery.where('company_id', company_id);
      }

      if (department_id) {
        baseQuery = baseQuery.where('department_id', department_id);
      }

      switch (report_type) {
        case 'summary':
          return await this.generateSummaryReport(baseQuery);
        case 'detailed':
          return await this.generateDetailedReport(baseQuery);
        case 'compliance':
          return await this.generateComplianceReport(filters);
        default:
          throw new ValidationError('Invalid report type');
      }
    } catch (error) {
      logger.error('Error generating audit report', { error, filters });
      throw error;
    }
  }

  /**
   * Generate summary report
   */
  private async generateSummaryReport(baseQuery: any): Promise<any> {
    const [
      totalActions,
      actionsByType,
      actionsByUser,
      actionsByResource
    ] = await Promise.all([
      baseQuery.clone().count('* as total'),
      baseQuery.clone()
        .select('action')
        .count('* as count')
        .groupBy('action')
        .orderBy('count', 'desc'),
      baseQuery.clone()
        .select('user_id')
        .count('* as count')
        .groupBy('user_id')
        .orderBy('count', 'desc')
        .limit(10),
      baseQuery.clone()
        .select('resource_type')
        .count('* as count')
        .groupBy('resource_type')
        .orderBy('count', 'desc')
    ]);

    return {
      totalActions: parseInt(totalActions[0].total),
      actionsByType: actionsByType,
      topUsers: actionsByUser,
      actionsByResource: actionsByResource
    };
  }

  /**
   * Generate detailed report
   */
  private async generateDetailedReport(baseQuery: any): Promise<any> {
    const logs = await baseQuery
      .select('*')
      .orderBy('created_at', 'desc')
      .limit(1000);

    return {
      logs: logs.map((log: any) => ({
        ...log,
        details: log.details ? JSON.parse(log.details) : undefined
      }))
    };
  }

  /**
   * Generate compliance report
   */
  private async generateComplianceReport(filters: any): Promise<any> {
    const db = getDatabase();
    const complianceLogs = await db('compliance_logs')
      .where('created_at', '>=', filters.start_date)
      .where('created_at', '<=', filters.end_date)
      .orderBy('created_at', 'desc');

    const complianceByType = await db('compliance_logs')
      .select('compliance_type')
      .count('* as count')
      .where('created_at', '>=', filters.start_date)
      .where('created_at', '<=', filters.end_date)
      .groupBy('compliance_type');

    return {
      totalComplianceEvents: complianceLogs.length,
      complianceByType: complianceByType,
      complianceLogs: complianceLogs.map(log => ({
        ...log,
        details: log.details ? JSON.parse(log.details) : undefined
      }))
    };
  }

  /**
   * Validate audit log data
   */
  private validateAuditLogData(data: AuditLogData): void {
    if (!data.user_id) {
      throw new ValidationError('User ID is required');
    }

    if (!data.action || data.action.trim().length === 0) {
      throw new ValidationError('Action is required');
    }

    if (!data.resource_type || data.resource_type.trim().length === 0) {
      throw new ValidationError('Resource type is required');
    }
  }

  /**
   * Validate data access log data
   */
  private validateDataAccessLogData(data: DataAccessLogData): void {
    if (!data.user_id) {
      throw new ValidationError('User ID is required');
    }

    if (!data.table_name || data.table_name.trim().length === 0) {
      throw new ValidationError('Table name is required');
    }

    if (!data.operation || !['SELECT', 'INSERT', 'UPDATE', 'DELETE'].includes(data.operation)) {
      throw new ValidationError('Valid operation is required');
    }
  }

  /**
   * Validate system event data
   */
  private validateSystemEventData(data: SystemEventData): void {
    if (!data.event_type || data.event_type.trim().length === 0) {
      throw new ValidationError('Event type is required');
    }

    if (!data.severity || !['info', 'warning', 'error', 'critical'].includes(data.severity)) {
      throw new ValidationError('Valid severity is required');
    }

    if (!data.message || data.message.trim().length === 0) {
      throw new ValidationError('Message is required');
    }
  }

  /**
   * Validate security event data
   */
  private validateSecurityEventData(data: SecurityEventData): void {
    if (!data.event_type || data.event_type.trim().length === 0) {
      throw new ValidationError('Event type is required');
    }

    if (!data.severity || !['low', 'medium', 'high', 'critical'].includes(data.severity)) {
      throw new ValidationError('Valid severity is required');
    }

    if (!data.message || data.message.trim().length === 0) {
      throw new ValidationError('Message is required');
    }
  }

  /**
   * Validate compliance log data
   */
  private validateComplianceLogData(data: ComplianceLogData): void {
    if (!data.compliance_type || data.compliance_type.trim().length === 0) {
      throw new ValidationError('Compliance type is required');
    }

    if (!data.action || data.action.trim().length === 0) {
      throw new ValidationError('Action is required');
    }
  }
}

export const auditService = new AuditService(); 