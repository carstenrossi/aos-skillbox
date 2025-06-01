import { Request, Response } from 'express';
import { AuthenticatedRequest, CreateUserRequest, UserRole } from '../types';
import { userModel } from '../models/User';
import emailService from '../services/emailService';
import passwordService from '../services/passwordService';
import auditService from '../services/auditService';
import { body, validationResult } from 'express-validator';

export class AdminController {
  // Create user by admin
  async createUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Validate input
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

      const userData: CreateUserRequest & { sendWelcomeEmail?: boolean } = req.body;
      const adminUser = req.user!;

      // Validate password strength
      const passwordValidation = passwordService.validatePassword(userData.password);
      if (!passwordValidation.isValid) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Password does not meet security requirements',
            code: 'WEAK_PASSWORD',
            details: passwordValidation.errors,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Validate email format
      if (!emailService.isValidEmail(userData.email)) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Invalid email format',
            code: 'INVALID_EMAIL',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Create user
      const newUser = await userModel.create(userData);

      // Log admin action
      await auditService.logAdminAction({
        adminUserId: adminUser.userId,
        action: 'CREATE_USER',
        targetUserId: newUser.id,
        details: {
          username: newUser.username,
          email: newUser.email,
          role: newUser.role,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      // Send welcome email if requested
      if (userData.sendWelcomeEmail !== false) {
        try {
          await emailService.sendWelcomeEmail(newUser, {
            temporaryPassword: userData.password,
            createdByAdmin: true,
          });
        } catch (emailError) {
          console.error('Failed to send welcome email:', emailError);
          // Don't fail user creation if email fails
        }
      }

      // Return user without password
      const safeUser = userModel.getSafeUser(newUser);

      res.status(201).json({
        success: true,
        data: {
          user: safeUser,
          passwordStrength: passwordValidation.strength,
        },
        message: 'User created successfully',
        timestamp: new Date().toISOString(),
      });

    } catch (error: any) {
      console.error('Admin user creation error:', error.message);

      const statusCode = error.message.includes('already exists') ? 409 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: {
          message: error.message,
          code: 'USER_CREATION_FAILED',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Get all users (admin view)
  async getUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const {
        page = 1,
        limit = 50,
        role,
        search,
        isActive,
        sortBy = 'created_at',
        sortOrder = 'desc'
      } = req.query;

      const users = await userModel.list(Number(limit), (Number(page) - 1) * Number(limit));
      const totalUsers = await userModel.count();

      // Filter if needed
      let filteredUsers = users;
      
      if (role) {
        filteredUsers = filteredUsers.filter(user => user.role === role);
      }
      
      if (isActive !== undefined) {
        filteredUsers = filteredUsers.filter(user => user.is_active === (isActive === 'true'));
      }
      
      if (search) {
        const searchTerm = String(search).toLowerCase();
        filteredUsers = filteredUsers.filter(user => 
          user.username.toLowerCase().includes(searchTerm) ||
          user.email.toLowerCase().includes(searchTerm) ||
          `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchTerm)
        );
      }

      // Remove passwords
      const safeUsers = filteredUsers.map(user => userModel.getSafeUser(user));

      res.status(200).json({
        success: true,
        data: {
          users: safeUsers,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total: totalUsers,
            pages: Math.ceil(totalUsers / Number(limit)),
          },
        },
        timestamp: new Date().toISOString(),
      });

    } catch (error: any) {
      console.error('Admin get users error:', error.message);
      
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to retrieve users',
          code: 'USERS_RETRIEVAL_FAILED',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Update user role (admin only)
  async updateUserRole(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { role } = req.body;
      const adminUser = req.user!;

      if (!role || !['user', 'manager', 'admin'].includes(role)) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Invalid role specified',
            code: 'INVALID_ROLE',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const updatedUser = await userModel.updateUserRole(userId, role as UserRole, adminUser.userId);
      
      if (!updatedUser) {
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

      // Log admin action
      await auditService.logAdminAction({
        adminUserId: adminUser.userId,
        action: 'UPDATE_USER_ROLE',
        targetUserId: userId,
        details: {
          oldRole: req.body.oldRole,
          newRole: role,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      // Send notification email
      try {
        await emailService.sendRoleChangeNotification(updatedUser, role);
      } catch (emailError) {
        console.error('Failed to send role change notification:', emailError);
      }

      const safeUser = userModel.getSafeUser(updatedUser);

      res.status(200).json({
        success: true,
        data: { user: safeUser },
        message: 'User role updated successfully',
        timestamp: new Date().toISOString(),
      });

    } catch (error: any) {
      console.error('Admin update user role error:', error.message);
      
      res.status(500).json({
        success: false,
        error: {
          message: error.message,
          code: 'ROLE_UPDATE_FAILED',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Admin password override
  async resetUserPassword(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { newPassword, sendNotification = true } = req.body;
      const adminUser = req.user!;

      if (!newPassword) {
        res.status(400).json({
          success: false,
          error: {
            message: 'New password is required',
            code: 'MISSING_PASSWORD',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Validate password strength
      const passwordValidation = passwordService.validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Password does not meet security requirements',
            code: 'WEAK_PASSWORD',
            details: passwordValidation.errors,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const targetUser = await userModel.findById(userId);
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

      // Update password
      await userModel.updatePassword(userId, newPassword);

      // Log admin action (CRITICAL - always log password resets)
      await auditService.logAdminAction({
        adminUserId: adminUser.userId,
        action: 'RESET_USER_PASSWORD',
        targetUserId: userId,
        details: {
          targetUsername: targetUser.username,
          targetEmail: targetUser.email,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'HIGH',
      });

      // Send notification email
      if (sendNotification) {
        try {
          await emailService.sendPasswordResetNotification(targetUser, {
            resetByAdmin: true,
            adminUsername: adminUser.username,
          });
        } catch (emailError) {
          console.error('Failed to send password reset notification:', emailError);
        }
      }

      res.status(200).json({
        success: true,
        message: 'Password reset successfully',
        data: {
          passwordStrength: passwordValidation.strength,
        },
        timestamp: new Date().toISOString(),
      });

    } catch (error: any) {
      console.error('Admin password reset error:', error.message);
      
      res.status(500).json({
        success: false,
        error: {
          message: error.message,
          code: 'PASSWORD_RESET_FAILED',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Deactivate/activate user
  async toggleUserStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { isActive } = req.body;
      const adminUser = req.user!;

      const targetUser = await userModel.findById(userId);
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

      const updatedUser = await userModel.update(userId, { is_active: isActive });

      // Log admin action
      await auditService.logAdminAction({
        adminUserId: adminUser.userId,
        action: isActive ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
        targetUserId: userId,
        details: {
          username: targetUser.username,
          email: targetUser.email,
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      // Send notification email
      try {
        await emailService.sendAccountStatusNotification(targetUser, isActive);
      } catch (emailError) {
        console.error('Failed to send account status notification:', emailError);
      }

      const safeUser = userModel.getSafeUser(updatedUser!);

      res.status(200).json({
        success: true,
        data: { user: safeUser },
        message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
        timestamp: new Date().toISOString(),
      });

    } catch (error: any) {
      console.error('Admin toggle user status error:', error.message);
      
      res.status(500).json({
        success: false,
        error: {
          message: error.message,
          code: 'STATUS_UPDATE_FAILED',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
}

// Validation middleware for user creation
export const validateUserCreation = [
  body('username')
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, hyphens, and underscores'),
  
  body('email')
    .isEmail()
    .withMessage('Must be a valid email address')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long'),
  
  body('first_name')
    .optional()
    .isLength({ max: 100 })
    .withMessage('First name must not exceed 100 characters'),
  
  body('last_name')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Last name must not exceed 100 characters'),
  
  body('role')
    .optional()
    .isIn(['user', 'manager', 'admin'])
    .withMessage('Role must be user, manager, or admin'),
];

export default new AdminController(); 