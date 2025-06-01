import winston from 'winston';
import path from 'path';
import fs from 'fs';

interface AuditLogEntry {
  adminUserId: string;
  action: string;
  targetUserId?: string;
  targetResource?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  timestamp: Date;
  sessionId?: string;
}

interface AuditQuery {
  adminUserId?: string;
  action?: string;
  targetUserId?: string;
  severity?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

class AuditService {
  private logger!: winston.Logger; // Using definite assignment assertion since initializeLogger is called in constructor
  private auditLogs: AuditLogEntry[] = []; // In-memory storage for demo
  private maxLogEntries = 10000; // Prevent memory overflow

  constructor() {
    this.initializeLogger();
  }

  private initializeLogger(): void {
    // Ensure logs directory exists
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'audit' },
      transports: [
        // Write all audit logs to audit.log
        new winston.transports.File({
          filename: path.join(logsDir, 'audit.log'),
          maxsize: 10 * 1024 * 1024, // 10MB
          maxFiles: 10,
          tailable: true,
        }),
        // Write error-level audit logs to error.log
        new winston.transports.File({
          filename: path.join(logsDir, 'audit-error.log'),
          level: 'error',
          maxsize: 5 * 1024 * 1024, // 5MB
          maxFiles: 5,
          tailable: true,
        }),
      ],
    });

    // Add console transport in development
    if (process.env.NODE_ENV !== 'production') {
      this.logger.add(new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      }));
    }
  }

  // Log admin action
  async logAdminAction(entry: Omit<AuditLogEntry, 'timestamp'>): Promise<void> {
    const auditEntry: AuditLogEntry = {
      ...entry,
      timestamp: new Date(),
      severity: entry.severity || 'MEDIUM',
    };

    // Store in memory for quick access
    this.auditLogs.unshift(auditEntry);
    
    // Maintain max entries limit
    if (this.auditLogs.length > this.maxLogEntries) {
      this.auditLogs = this.auditLogs.slice(0, this.maxLogEntries);
    }

    // Log to file
    const logLevel = this.getLogLevel(auditEntry.severity || 'MEDIUM');
    this.logger.log(logLevel, 'Admin Action', {
      adminUserId: auditEntry.adminUserId,
      action: auditEntry.action,
      targetUserId: auditEntry.targetUserId,
      targetResource: auditEntry.targetResource,
      details: auditEntry.details,
      ipAddress: auditEntry.ipAddress,
      userAgent: auditEntry.userAgent,
      severity: auditEntry.severity,
      timestamp: auditEntry.timestamp.toISOString(),
      sessionId: auditEntry.sessionId,
    });

    // Alert on critical actions
    if (auditEntry.severity === 'CRITICAL') {
      await this.handleCriticalAction(auditEntry);
    }

    console.log(`🔍 [AUDIT] ${auditEntry.action} by admin ${auditEntry.adminUserId} - ${auditEntry.severity}`);
  }

  private getLogLevel(severity: string): string {
    switch (severity) {
      case 'LOW': return 'info';
      case 'MEDIUM': return 'warn';
      case 'HIGH': return 'error';
      case 'CRITICAL': return 'error';
      default: return 'info';
    }
  }

  private async handleCriticalAction(entry: AuditLogEntry): Promise<void> {
    // In production, you might want to:
    // - Send alerts to security team
    // - Trigger additional monitoring
    // - Create incident tickets
    
    console.error(`🚨 CRITICAL AUDIT EVENT: ${entry.action} by ${entry.adminUserId}`);
    
    // Log additional security information
    this.logger.error('CRITICAL SECURITY EVENT', {
      ...entry,
      alert: 'IMMEDIATE_ATTENTION_REQUIRED',
      notificationSent: new Date().toISOString(),
    });
  }

  // Get audit logs with filtering
  async getAuditLogs(query: AuditQuery = {}): Promise<{
    logs: AuditLogEntry[];
    total: number;
    page: number;
    limit: number;
  }> {
    let filteredLogs = [...this.auditLogs];

    // Apply filters
    if (query.adminUserId) {
      filteredLogs = filteredLogs.filter(log => log.adminUserId === query.adminUserId);
    }

    if (query.action) {
      filteredLogs = filteredLogs.filter(log => 
        log.action.toLowerCase().includes(query.action!.toLowerCase())
      );
    }

    if (query.targetUserId) {
      filteredLogs = filteredLogs.filter(log => log.targetUserId === query.targetUserId);
    }

    if (query.severity) {
      filteredLogs = filteredLogs.filter(log => log.severity === query.severity);
    }

    if (query.startDate) {
      filteredLogs = filteredLogs.filter(log => log.timestamp >= query.startDate!);
    }

    if (query.endDate) {
      filteredLogs = filteredLogs.filter(log => log.timestamp <= query.endDate!);
    }

    const total = filteredLogs.length;
    const limit = query.limit || 50;
    const offset = query.offset || 0;
    const page = Math.floor(offset / limit) + 1;

    // Apply pagination
    const paginatedLogs = filteredLogs.slice(offset, offset + limit);

    return {
      logs: paginatedLogs,
      total,
      page,
      limit,
    };
  }

  // Get audit statistics
  async getAuditStats(timeRange: '24h' | '7d' | '30d' = '24h'): Promise<{
    totalActions: number;
    actionsByType: Record<string, number>;
    actionsBySeverity: Record<string, number>;
    topAdmins: Array<{ adminUserId: string; actionCount: number }>;
    criticalActionsCount: number;
  }> {
    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    const relevantLogs = this.auditLogs.filter(log => log.timestamp >= startDate);

    const actionsByType: Record<string, number> = {};
    const actionsBySeverity: Record<string, number> = {};
    const adminActionCount: Record<string, number> = {};

    relevantLogs.forEach(log => {
      // Count by action type
      actionsByType[log.action] = (actionsByType[log.action] || 0) + 1;

      // Count by severity
      actionsBySeverity[log.severity || 'MEDIUM'] = (actionsBySeverity[log.severity || 'MEDIUM'] || 0) + 1;

      // Count by admin
      adminActionCount[log.adminUserId] = (adminActionCount[log.adminUserId] || 0) + 1;
    });

    const topAdmins = Object.entries(adminActionCount)
      .map(([adminUserId, actionCount]) => ({ adminUserId, actionCount }))
      .sort((a, b) => b.actionCount - a.actionCount)
      .slice(0, 10);

    const criticalActionsCount = relevantLogs.filter(log => log.severity === 'CRITICAL').length;

    return {
      totalActions: relevantLogs.length,
      actionsByType,
      actionsBySeverity,
      topAdmins,
      criticalActionsCount,
    };
  }

  // Search audit logs
  async searchAuditLogs(searchTerm: string, limit: number = 100): Promise<AuditLogEntry[]> {
    const searchLower = searchTerm.toLowerCase();
    
    return this.auditLogs
      .filter(log => {
        const searchableContent = [
          log.action,
          log.adminUserId,
          log.targetUserId,
          JSON.stringify(log.details),
          log.ipAddress,
        ].join(' ').toLowerCase();

        return searchableContent.includes(searchLower);
      })
      .slice(0, limit);
  }

  // Export audit logs (for compliance)
  async exportAuditLogs(
    query: AuditQuery = {},
    format: 'json' | 'csv' = 'json'
  ): Promise<string> {
    const { logs } = await this.getAuditLogs(query);

    if (format === 'csv') {
      return this.convertToCSV(logs);
    }

    return JSON.stringify(logs, null, 2);
  }

  private convertToCSV(logs: AuditLogEntry[]): string {
    if (logs.length === 0) return '';

    const headers = [
      'timestamp',
      'adminUserId',
      'action',
      'targetUserId',
      'targetResource',
      'severity',
      'ipAddress',
      'userAgent',
      'details'
    ];

    const csvRows = [
      headers.join(','),
      ...logs.map(log => [
        log.timestamp.toISOString(),
        log.adminUserId,
        log.action,
        log.targetUserId || '',
        log.targetResource || '',
        log.severity || 'MEDIUM',
        log.ipAddress || '',
        log.userAgent ? `"${log.userAgent.replace(/"/g, '""')}"` : '',
        log.details ? `"${JSON.stringify(log.details).replace(/"/g, '""')}"` : ''
      ].join(','))
    ];

    return csvRows.join('\n');
  }

  // Predefined audit actions for consistency
  static readonly ACTIONS = {
    // User management
    CREATE_USER: 'CREATE_USER',
    UPDATE_USER: 'UPDATE_USER',
    DELETE_USER: 'DELETE_USER',
    UPDATE_USER_ROLE: 'UPDATE_USER_ROLE',
    ACTIVATE_USER: 'ACTIVATE_USER',
    DEACTIVATE_USER: 'DEACTIVATE_USER',
    RESET_USER_PASSWORD: 'RESET_USER_PASSWORD',
    
    // Security actions
    LOGIN_AS_USER: 'LOGIN_AS_USER',
    FORCE_LOGOUT_USER: 'FORCE_LOGOUT_USER',
    GRANT_PERMISSION: 'GRANT_PERMISSION',
    REVOKE_PERMISSION: 'REVOKE_PERMISSION',
    
    // System management
    UPDATE_SYSTEM_SETTINGS: 'UPDATE_SYSTEM_SETTINGS',
    BACKUP_DATABASE: 'BACKUP_DATABASE',
    RESTORE_DATABASE: 'RESTORE_DATABASE',
    
    // Content management
    DELETE_CONTENT: 'DELETE_CONTENT',
    MODIFY_CONTENT: 'MODIFY_CONTENT',
    EXPORT_DATA: 'EXPORT_DATA',
  } as const;

  // Severity levels
  static readonly SEVERITY = {
    LOW: 'LOW',
    MEDIUM: 'MEDIUM',
    HIGH: 'HIGH',
    CRITICAL: 'CRITICAL',
  } as const;

  // Get action severity mapping
  static getActionSeverity(action: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const criticalActions = [
      'DELETE_USER',
      'RESET_USER_PASSWORD',
      'LOGIN_AS_USER',
      'RESTORE_DATABASE',
      'UPDATE_SYSTEM_SETTINGS'
    ];

    const highActions = [
      'UPDATE_USER_ROLE',
      'DEACTIVATE_USER',
      'GRANT_PERMISSION',
      'REVOKE_PERMISSION',
      'BACKUP_DATABASE'
    ];

    const mediumActions = [
      'CREATE_USER',
      'UPDATE_USER',
      'ACTIVATE_USER',
      'FORCE_LOGOUT_USER'
    ];

    if (criticalActions.includes(action)) return 'CRITICAL';
    if (highActions.includes(action)) return 'HIGH';
    if (mediumActions.includes(action)) return 'MEDIUM';
    return 'LOW';
  }

  // Health check for audit service
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    logsCount: number;
    oldestLog?: Date;
    newestLog?: Date;
    loggerStatus: boolean;
  }> {
    try {
      const logsCount = this.auditLogs.length;
      const oldestLog = logsCount > 0 ? this.auditLogs[logsCount - 1].timestamp : undefined;
      const newestLog = logsCount > 0 ? this.auditLogs[0].timestamp : undefined;

      return {
        status: 'healthy',
        logsCount,
        oldestLog,
        newestLog,
        loggerStatus: !!this.logger,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        logsCount: 0,
        loggerStatus: false,
      };
    }
  }
}

export default new AuditService(); 