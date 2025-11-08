/**
 * Security Audit Logging Service
 * Tracks authentication events and security-related activities
 */
class AuditLogger {
  constructor() {
    this.logLevel = process.env.AUDIT_LOG_LEVEL || 'info';
    this.enableConsoleLogging = process.env.NODE_ENV !== 'production';
  }

  /**
   * Log authentication events
   * @param {Object} event - Authentication event details
   */
  logAuthEvent(event) {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      type: 'AUTH_EVENT',
      action: event.action, // LOGIN_SUCCESS, LOGIN_FAILED, LOGOUT, TOKEN_REFRESH
      userId: event.userId || null,
      email: event.email || null,
      ip: event.ip || null,
      userAgent: event.userAgent || null,
      success: event.success || false,
      errorMessage: event.errorMessage || null,
      metadata: event.metadata || {}
    };

    this.writeAuditLog(auditEntry);
  }

  /**
   * Log security events
   * @param {Object} event - Security event details
   */
  logSecurityEvent(event) {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      type: 'SECURITY_EVENT',
      action: event.action, // TOKEN_BLACKLISTED, SUSPICIOUS_ACTIVITY, RATE_LIMIT_HIT
      userId: event.userId || null,
      ip: event.ip || null,
      severity: event.severity || 'medium', // low, medium, high, critical
      details: event.details || {},
      metadata: event.metadata || {}
    };

    this.writeAuditLog(auditEntry);
  }

  /**
   * Log admin actions
   * @param {Object} event - Admin action details
   */
  logAdminEvent(event) {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      type: 'ADMIN_EVENT',
      action: event.action, // USER_INVITED, ROLE_CHANGED, USER_DEACTIVATED
      adminUserId: event.adminUserId,
      targetUserId: event.targetUserId || null,
      targetEmail: event.targetEmail || null,
      oldValue: event.oldValue || null,
      newValue: event.newValue || null,
      ip: event.ip || null,
      metadata: event.metadata || {}
    };

    this.writeAuditLog(auditEntry);
  }

  /**
   * Log data access events
   * @param {Object} event - Data access event details
   */
  logDataEvent(event) {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      type: 'DATA_EVENT',
      action: event.action, // CARD_PROCESSED, DATA_EXPORTED, CONFIG_CHANGED
      userId: event.userId,
      organizationId: event.organizationId || null,
      resourceType: event.resourceType || null,
      resourceId: event.resourceId || null,
      ip: event.ip || null,
      metadata: event.metadata || {}
    };

    this.writeAuditLog(auditEntry);
  }

  /**
   * Write audit log entry
   * @param {Object} entry - Audit log entry
   */
  writeAuditLog(entry) {
    // Console logging for development
    if (this.enableConsoleLogging) {
      const logColor = this.getLogColor(entry.type, entry.action);
      console.log(`${logColor}[AUDIT] ${entry.type}: ${entry.action}`, {
        timestamp: entry.timestamp,
        userId: entry.userId,
        ip: entry.ip,
        details: entry.details || entry.errorMessage || 'N/A'
      });
    }

    // In production, you would send this to:
    // - External logging service (e.g., Splunk, ELK stack)
    // - Database audit table
    // - File system (with log rotation)
    // - SIEM system

    // For now, we'll store in memory for basic tracking
    this.storeInMemory(entry);
  }

  /**
   * Store audit logs in memory (for development/testing)
   * In production, replace with persistent storage
   */
  storeInMemory(entry) {
    if (!this.auditLogs) {
      this.auditLogs = [];
    }

    this.auditLogs.push(entry);

    // Keep only last 1000 entries in memory
    if (this.auditLogs.length > 1000) {
      this.auditLogs = this.auditLogs.slice(-1000);
    }
  }

  /**
   * Get color for console logging based on event type and action
   */
  getLogColor(type, action) {
    const colors = {
      reset: '\x1b[0m',
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      magenta: '\x1b[35m',
      cyan: '\x1b[36m'
    };

    if (type === 'SECURITY_EVENT') return colors.red;
    if (type === 'AUTH_EVENT') {
      return action.includes('SUCCESS') ? colors.green : colors.yellow;
    }
    if (type === 'ADMIN_EVENT') return colors.magenta;
    if (type === 'DATA_EVENT') return colors.blue;
    
    return colors.cyan;
  }

  /**
   * Get recent audit logs (for admin dashboard)
   * @param {Object} filter - Filter options
   * @returns {Array} - Filtered audit logs
   */
  getAuditLogs(filter = {}) {
    if (!this.auditLogs) return [];

    let logs = [...this.auditLogs];

    // Apply filters
    if (filter.type) {
      logs = logs.filter(log => log.type === filter.type);
    }
    if (filter.userId) {
      logs = logs.filter(log => log.userId === filter.userId);
    }
    if (filter.startDate) {
      logs = logs.filter(log => new Date(log.timestamp) >= new Date(filter.startDate));
    }
    if (filter.endDate) {
      logs = logs.filter(log => new Date(log.timestamp) <= new Date(filter.endDate));
    }

    // Sort by timestamp (newest first)
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Limit results
    const limit = filter.limit || 100;
    return logs.slice(0, limit);
  }

  /**
   * Get audit statistics
   * @returns {Object} - Audit statistics
   */
  getAuditStats() {
    if (!this.auditLogs) return {};

    const stats = {
      totalEvents: this.auditLogs.length,
      eventTypes: {},
      recentActivity: this.auditLogs.slice(-10),
      securityEvents: this.auditLogs.filter(log => log.type === 'SECURITY_EVENT').length
    };

    // Count by type
    this.auditLogs.forEach(log => {
      stats.eventTypes[log.type] = (stats.eventTypes[log.type] || 0) + 1;
    });

    return stats;
  }

  /**
   * Helper method to extract request info
   * @param {Object} req - Express request object
   * @returns {Object} - Request information
   */
  extractRequestInfo(req) {
    return {
      ip: req.ip || req.connection?.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown',
      method: req.method,
      path: req.path,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Clear audit logs (for testing)
   */
  clearLogs() {
    this.auditLogs = [];
  }
}

// Export singleton instance
module.exports = new AuditLogger();