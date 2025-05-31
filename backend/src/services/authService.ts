import jwt from 'jsonwebtoken';
import { User, AuthResponse, JWTPayload } from '../types';
import userModel from '../models/User';

// Environment variables with defaults
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key-change-this-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m'; // 15 minutes
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d'; // 7 days

// In-memory refresh token storage (später durch Redis ersetzen)
const refreshTokens = new Set<string>();

class AuthService {
  generateTokens(user: User): { accessToken: string; refreshToken: string } {
    const now = Math.floor(Date.now() / 1000);
    
    const payload: JWTPayload = {
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      isAdmin: user.is_admin, // Backward compatibility
      iat: now,
      exp: now + (15 * 60), // 15 minutes
    };

    const accessToken = jwt.sign(payload as any, JWT_SECRET as string);
    
    const refreshPayload = {
      userId: user.id,
      type: 'refresh',
      iat: now,
      exp: now + (7 * 24 * 60 * 60), // 7 days
    };
    
    const refreshToken = jwt.sign(refreshPayload, JWT_REFRESH_SECRET as string);
    
    // Store refresh token
    refreshTokens.add(refreshToken);
    
    return { accessToken, refreshToken };
  }

  async login(username: string, password: string): Promise<AuthResponse> {
    // Find user by username or email
    let user = await userModel.findByUsername(username);
    if (!user) {
      user = await userModel.findByEmail(username);
    }

    if (!user) {
      throw new Error('Invalid credentials');
    }

    if (!user.is_active) {
      throw new Error('Account is deactivated');
    }

    // Verify password
    const isValidPassword = await userModel.verifyPassword(user, password);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Update last login
    await userModel.updateLastLogin(user.id);

    // Generate tokens
    const { accessToken, refreshToken } = this.generateTokens(user);

    return {
      token: accessToken,
      refreshToken,
      user: userModel.getSafeUser(user),
    };
  }

  async register(userData: {
    username: string;
    email: string;
    password: string;
    first_name?: string;
    last_name?: string;
  }): Promise<AuthResponse> {
    // Validate input
    if (!userData.username || userData.username.length < 3) {
      throw new Error('Username must be at least 3 characters long');
    }

    if (!userData.email || !this.isValidEmail(userData.email)) {
      throw new Error('Please provide a valid email address');
    }

    if (!userData.password || userData.password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    try {
      // Create user
      const user = await userModel.create(userData);

      // Generate tokens
      const { accessToken, refreshToken } = this.generateTokens(user);

      return {
        token: accessToken,
        refreshToken,
        user: userModel.getSafeUser(user),
      };
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        throw new Error('Username or email already exists');
      }
      throw error;
    }
  }

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    if (!refreshTokens.has(refreshToken)) {
      throw new Error('Invalid refresh token');
    }

    try {
      const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as any;
      
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      const user = await userModel.findById(decoded.userId);
      if (!user || !user.is_active) {
        throw new Error('User not found or inactive');
      }

      // Remove old refresh token
      refreshTokens.delete(refreshToken);

      // Generate new tokens
      const { accessToken, refreshToken: newRefreshToken } = this.generateTokens(user);

      return {
        token: accessToken,
        refreshToken: newRefreshToken,
        user: userModel.getSafeUser(user),
      };
    } catch (error) {
      // Remove invalid refresh token
      refreshTokens.delete(refreshToken);
      throw new Error('Invalid or expired refresh token');
    }
  }

  async logout(refreshToken?: string): Promise<void> {
    if (refreshToken) {
      refreshTokens.delete(refreshToken);
    }
  }

  verifyToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, JWT_SECRET) as JWTPayload;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  async validateUser(userId: string): Promise<User | null> {
    const user = await userModel.findById(userId);
    if (!user || !user.is_active) {
      return null;
    }
    return user;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Password reset functionality (for future implementation)
  async requestPasswordReset(email: string): Promise<void> {
    const user = await userModel.findByEmail(email);
    if (!user) {
      // Don't reveal if email exists or not
      return;
    }

    // TODO: Generate reset token and send email
    console.log(`Password reset requested for ${email}`);
  }

  async resetPassword(resetToken: string, newPassword: string): Promise<void> {
    // TODO: Verify reset token and update password
    throw new Error('Password reset not implemented yet');
  }

  // Admin functions
  async promoteToAdmin(userId: string, promotedBy: string): Promise<void> {
    const user = await userModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    await userModel.update(userId, { is_admin: true });
    console.log(`User ${user.username} promoted to admin by ${promotedBy}`);
  }

  async deactivateUser(userId: string, deactivatedBy: string): Promise<void> {
    const user = await userModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    await userModel.update(userId, { is_active: false });
    console.log(`User ${user.username} deactivated by ${deactivatedBy}`);
  }
}

// Singleton instance
export const authService = new AuthService();
export default authService; 