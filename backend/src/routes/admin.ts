import { Router, Request, Response, NextFunction } from 'express';
import adminController, { validateUserCreation } from '../controllers/adminController';
import auditService from '../services/auditService';
import emailService from '../services/emailService';
import passwordService from '../services/passwordService';
import { authenticateToken, requireAdmin, customRateLimit } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { body, query, validationResult } from 'express-validator';
import { getUserModel } from '../models/UserSQLite';

const router = Router();

// Apply authentication middleware to all admin routes
router.use(authenticateToken as any);
router.use(requireAdmin as any);

// Apply rate limiting to admin routes - more permissive for development
router.use(customRateLimit(1000, 5 * 60 * 1000) as any); // 1000 requests per 5 minutes (will be 10000 in dev)

// User Management Routes

// POST /api/admin/users - Create new user
router.post('/users', validateUserCreation, adminController.createUser as any);

// GET /api/admin/users - Get all users with filtering and pagination
router.get('/users', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('role').optional().isIn(['user', 'manager', 'admin']).withMessage('Invalid role'),
  query('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
  query('search').optional().isString().withMessage('Search must be a string'),
], adminController.getUsers as any);

// GET /api/admin/users/:userId - Get specific user
router.get('/users/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await getUserModel().findById(req.params.userId);
    
    if (!user) {
      res.status(404).json({
        success: false,
        error: {
          message: 'User not found',
          code: 'USER_NOT_FOUND',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const safeUser = getUserModel().getSafeUser(user);
    
    res.status(200).json({
      success: true,
      data: { user: safeUser },
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('Admin get user error:', error.message);
    
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve user',
        code: 'USER_RETRIEVAL_FAILED',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

// PUT /api/admin/users/:userId/role - Update user role
router.put('/users/:userId/role', [
  body('role').isIn(['user', 'manager', 'admin']).withMessage('Invalid role'),
], adminController.updateUserRole as any);

// PUT /api/admin/users/:userId/password - Reset user password (admin override)
router.put('/users/:userId/password', [
  body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('sendNotification').optional().isBoolean().withMessage('sendNotification must be boolean'),
], adminController.resetUserPassword as any);

// PUT /api/admin/users/:userId/status - Activate/deactivate user
router.put('/users/:userId/status', [
  body('isActive').isBoolean().withMessage('isActive is required and must be boolean'),
], adminController.toggleUserStatus as any);

// DELETE /api/admin/users/:userId - Delete user (hard delete)
router.delete('/users/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const adminUser = (req as unknown as AuthenticatedRequest).user!;

    const targetUser = await getUserModel().findById(userId);
    if (!targetUser) {
      res.status(404).json({
        success: false,
        error: {
          message: 'User not found',
          code: 'USER_NOT_FOUND',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Prevent admin from deleting themselves
    if (userId === adminUser.userId) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Cannot delete your own account',
          code: 'CANNOT_DELETE_SELF',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Hard delete the user
    const deleted = await getUserModel().delete(userId);

    if (!deleted) {
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to delete user from database',
          code: 'DATABASE_DELETE_FAILED',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Log critical admin action
    await auditService.logAdminAction({
      adminUserId: adminUser.userId,
      action: 'DELETE_USER',
      targetUserId: userId,
      details: {
        username: targetUser.username,
        email: targetUser.email,
        role: targetUser.role,
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      severity: 'CRITICAL',
    });

    // Send notification email
    try {
      await emailService.sendAccountStatusNotification(targetUser, false);
    } catch (emailError) {
      console.error('Failed to send account deletion notification:', emailError);
    }

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('Admin delete user error:', error.message);
    
    res.status(500).json({
      success: false,
      error: {
        message: error.message,
        code: 'USER_DELETION_FAILED',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

// Password Management Routes

// POST /api/admin/password/generate - Generate secure password
router.post('/password/generate', [
  body('length').optional().isInt({ min: 8, max: 64 }).withMessage('Length must be between 8 and 64'),
  body('role').optional().isIn(['user', 'manager', 'admin']).withMessage('Invalid role'),
], async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: errors.array(),
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const { length = 16, role = 'user' } = req.body;
    const policy = passwordService.getPolicyForRole(role);
    
    const password = passwordService.generateSecurePassword(length, policy);
    const validation = passwordService.validatePassword(password, policy);

    res.status(200).json({
      success: true,
      data: {
        password,
        strength: validation.strength,
        score: validation.score,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('Password generation error:', error.message);
    
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to generate password',
        code: 'PASSWORD_GENERATION_FAILED',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /api/admin/password/validate - Validate password strength
router.post('/password/validate', [
  body('password').notEmpty().withMessage('Password is required'),
  body('username').optional().isString(),
  body('email').optional().isEmail(),
  body('role').optional().isIn(['user', 'manager', 'admin']),
], async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: errors.array(),
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const { password, username, email, role = 'user' } = req.body;
    const policy = passwordService.getPolicyForRole(role);
    
    const validation = passwordService.validatePassword(password, policy, username, email);

    res.status(200).json({
      success: true,
      data: validation,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('Password validation error:', error.message);
    
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to validate password',
        code: 'PASSWORD_VALIDATION_FAILED',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

// Audit & Logging Routes

// GET /api/admin/audit/logs - Get audit logs
router.get('/audit/logs', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('adminUserId').optional().isString(),
  query('action').optional().isString(),
  query('targetUserId').optional().isString(),
  query('severity').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
], async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: errors.array(),
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const {
      page = 1,
      limit = 50,
      adminUserId,
      action,
      targetUserId,
      severity,
      startDate,
      endDate,
    } = req.query;

    const query = {
      adminUserId: adminUserId as string,
      action: action as string,
      targetUserId: targetUserId as string,
      severity: severity as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit),
    };

    const result = await auditService.getAuditLogs(query);

    res.status(200).json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('Get audit logs error:', error.message);
    
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve audit logs',
        code: 'AUDIT_LOGS_RETRIEVAL_FAILED',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /api/admin/audit/stats - Get audit statistics
router.get('/audit/stats', [
  query('timeRange').optional().isIn(['24h', '7d', '30d']),
], async (req: Request, res: Response): Promise<void> => {
  try {
    const { timeRange = '24h' } = req.query;
    const stats = await auditService.getAuditStats(timeRange as '24h' | '7d' | '30d');

    res.status(200).json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('Get audit stats error:', error.message);
    
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve audit statistics',
        code: 'AUDIT_STATS_FAILED',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /api/admin/audit/export - Export audit logs
router.get('/audit/export', [
  query('format').optional().isIn(['json', 'csv']),
  query('adminUserId').optional().isString(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
], async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      format = 'json',
      adminUserId,
      startDate,
      endDate,
    } = req.query;

    const query = {
      adminUserId: adminUserId as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
    };

    const exportData = await auditService.exportAuditLogs(query, format as 'json' | 'csv');

    const filename = `audit-logs-${new Date().toISOString().split('T')[0]}.${format}`;
    const contentType = format === 'csv' ? 'text/csv' : 'application/json';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(exportData);

  } catch (error: any) {
    console.error('Export audit logs error:', error.message);
    
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to export audit logs',
        code: 'AUDIT_EXPORT_FAILED',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

// Email & System Routes

// POST /api/admin/email/test - Test email configuration
router.post('/email/test', [
  body('to').isEmail().withMessage('Valid email address required'),
], async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: errors.array(),
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const { to } = req.body;
    
    // Test connection first
    const connectionTest = await emailService.testConnection();
    if (!connectionTest) {
      res.status(500).json({
        success: false,
        error: {
          message: 'Email service not properly configured',
          code: 'EMAIL_NOT_CONFIGURED',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    await emailService.sendTestEmail(to);

    res.status(200).json({
      success: true,
      message: 'Test email sent successfully',
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('Test email error:', error.message);
    
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to send test email',
        code: 'TEST_EMAIL_FAILED',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /api/admin/system/health - System health check
router.get('/system/health', async (req: Request, res: Response): Promise<void> => {
  try {
    const emailStatus = await emailService.testConnection();
    const auditStatus = await auditService.healthCheck();

    const health = {
      email: {
        status: emailStatus ? 'healthy' : 'unhealthy',
        configured: emailStatus,
      },
      audit: auditStatus,
      timestamp: new Date().toISOString(),
    };

    const overallStatus = emailStatus && auditStatus.status === 'healthy' ? 'healthy' : 'degraded';

    res.status(overallStatus === 'healthy' ? 200 : 503).json({
      success: true,
      data: {
        status: overallStatus,
        services: health,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('Health check error:', error.message);
    
    res.status(500).json({
      success: false,
      error: {
        message: 'Health check failed',
        code: 'HEALTH_CHECK_FAILED',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

export default router; 