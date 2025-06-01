import express from 'express';
import { Router, Request, Response } from 'express';
import authService from '../services/authService';
import { CreateUserRequest, LoginRequest } from '../types';
import RoleService from '../services/roleService';
import { AuthenticatedRequest, UserRole } from '../types';
import { authenticateToken, requireAdmin, requireRole, customRateLimit } from '../middleware/auth';
import { getUserModel } from '../models/UserSQLite';

const router = Router();

// Apply rate limiting to all auth routes - more permissive for development
router.use(customRateLimit(500, 5 * 60 * 1000)); // 500 requests per 5 minutes (will be 5000 in dev)

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password }: LoginRequest = req.body;

    if (!username || !password) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Username and password are required',
          code: 'MISSING_CREDENTIALS',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const authResponse = await authService.login(username, password);

    res.status(200).json({
      success: true,
      data: authResponse,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Login error:', error.message);
    
    res.status(401).json({
      success: false,
      error: {
        message: error.message,
        code: 'LOGIN_FAILED',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const userData: CreateUserRequest = req.body;

    if (!userData.username || !userData.email || !userData.password) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Username, email, and password are required',
          code: 'MISSING_FIELDS',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const authResponse = await authService.register(userData);

    res.status(201).json({
      success: true,
      data: authResponse,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Registration error:', error.message);
    
    const statusCode = error.message.includes('already exists') ? 409 : 400;
    
    res.status(statusCode).json({
      success: false,
      error: {
        message: error.message,
        code: 'REGISTRATION_FAILED',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Refresh token is required',
          code: 'MISSING_REFRESH_TOKEN',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const authResponse = await authService.refreshToken(refreshToken);

    res.status(200).json({
      success: true,
      data: authResponse,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Token refresh error:', error.message);
    
    res.status(401).json({
      success: false,
      error: {
        message: error.message,
        code: 'TOKEN_REFRESH_FAILED',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /api/auth/logout
router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    
    await authService.logout(refreshToken);

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Logout error:', error.message);
    
    res.status(400).json({
      success: false,
      error: {
        message: error.message,
        code: 'LOGOUT_FAILED',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Email is required',
          code: 'MISSING_EMAIL',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    await authService.requestPasswordReset(email);

    // Always return success to prevent email enumeration
    res.status(200).json({
      success: true,
      message: 'If the email exists, a password reset link has been sent',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Password reset request error:', error.message);
    
    res.status(400).json({
      success: false,
      error: {
        message: 'Failed to process password reset request',
        code: 'PASSWORD_RESET_FAILED',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Reset token and new password are required',
          code: 'MISSING_FIELDS',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    await authService.resetPassword(resetToken, newPassword);

    res.status(200).json({
      success: true,
      message: 'Password reset successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Password reset error:', error.message);
    
    res.status(400).json({
      success: false,
      error: {
        message: error.message,
        code: 'PASSWORD_RESET_FAILED',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

// TODO: Fix AuthenticatedRequest type issues and re-enable profile and admin routes
// Additional role-based routes will be added here once TypeScript issues are resolved

export default router; 