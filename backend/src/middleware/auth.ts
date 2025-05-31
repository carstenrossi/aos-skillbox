import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest, JWTPayload, UserRole } from '../types';
import { userModel } from '../models/User';
import RoleService from '../services/roleService';
import expressRateLimit from 'express-rate-limit';

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';

// Rate limiting storage (in-memory, später Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Middleware to authenticate JWT tokens
 */
export const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = (req.headers as any).authorization as string | undefined;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({
        success: false,
        error: {
          message: 'Access token required',
          code: 'MISSING_TOKEN'
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    
    // Check if user still exists and is active
    const user = await userModel.findById(decoded.userId);
    if (!user || !user.is_active) {
      res.status(401).json({
        success: false,
        error: {
          message: 'User not found or inactive',
          code: 'USER_INACTIVE'
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Update payload with current user data (role might have changed)
    req.user = {
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      isAdmin: user.is_admin,
      iat: decoded.iat,
      exp: decoded.exp
    };

    next();
  } catch (error: any) {
    res.status(401).json({
      success: false,
      error: {
        message: 'Invalid or expired token',
        code: 'INVALID_TOKEN',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Middleware that requires a specific role or higher
 */
export const requireRole = (requiredRole: UserRole) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required',
          code: 'NOT_AUTHENTICATED'
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (!RoleService.isRoleHigherOrEqual(req.user.role, requiredRole)) {
      res.status(403).json({
        success: false,
        error: {
          message: `Access denied. Required role: ${RoleService.getRoleDisplayName(requiredRole)} or higher`,
          code: 'INSUFFICIENT_ROLE',
          details: {
            userRole: req.user.role,
            requiredRole: requiredRole
          }
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    next();
  };
};

/**
 * Middleware that requires a specific permission
 */
export const requirePermission = (permission: keyof typeof RoleService.prototype) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required',
          code: 'NOT_AUTHENTICATED'
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (!RoleService.hasPermission(req.user.role, permission as any)) {
      res.status(403).json({
        success: false,
        error: {
          message: `Access denied. Missing permission: ${String(permission)}`,
          code: 'INSUFFICIENT_PERMISSION',
          details: {
            userRole: req.user.role,
            requiredPermission: String(permission)
          }
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    next();
  };
};

/**
 * Legacy middleware for admin-only access (backward compatibility)
 */
export const requireAdmin = requireRole('admin');

/**
 * Middleware for manager or admin access
 */
export const requireManager = requireRole('manager');

/**
 * Optional authentication middleware
 */
export const optionalAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = (req.headers as any).authorization as string | undefined;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
      const user = await userModel.findById(decoded.userId);
      
      if (user && user.is_active) {
        req.user = {
          userId: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          isAdmin: user.is_admin,
          iat: decoded.iat,
          exp: decoded.exp
        };
      }
    }
    
    next();
  } catch (error) {
    // Ignore auth errors for optional auth
    next();
  }
};

/**
 * Simple rate limiting middleware
 */
export const customRateLimit = (maxRequests: number = 100, windowMs: number = 15 * 60 * 1000): any => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const clientId = req.ip || 'unknown';
    const now = Date.now();
    
    const clientData = rateLimitStore.get(clientId);
    
    if (!clientData || now > clientData.resetTime) {
      // Reset or initialize
      rateLimitStore.set(clientId, {
        count: 1,
        resetTime: now + windowMs
      });
      next();
      return;
    }
    
    if (clientData.count >= maxRequests) {
      res.status(429).json({
        success: false,
        error: {
          message: 'Too many requests',
          code: 'RATE_LIMIT_EXCEEDED',
          details: {
            limit: maxRequests,
            windowMs: windowMs,
            resetAt: new Date(clientData.resetTime).toISOString()
          }
        },
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    clientData.count++;
    rateLimitStore.set(clientId, clientData);
    next();
  };
};

export default {
  authenticateToken,
  requireAdmin,
  optionalAuth,
  rateLimit: customRateLimit,
}; 