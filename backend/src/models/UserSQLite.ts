import { User, CreateUserRequest, UserRole, RolePermissions } from '../types';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import RoleService from '../services/roleService';
import { Database } from 'sqlite3';
import { promisify } from 'util';

// SQLite-based User Storage
export class UserModelSQLite {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
    // Don't call initTables and createDefaultUsers here
    // These will be handled by migrations
  }

  async initialize(): Promise<void> {
    // This method can be called after migrations are complete
    await this.createDefaultUsers();
  }

  private async createDefaultUsers(): Promise<void> {
    try {
      // Check if admin user already exists
      const adminExists = await this.findByUsername('admin');
      if (adminExists) {
        return; // Default users already exist
      }

      // Admin user
      const adminId = uuidv4();
      const adminPassword = await bcrypt.hash('admin123', 12);
      
      const adminUser: User = {
        id: adminId,
        username: 'admin',
        email: 'admin@skillbox.local',
        password_hash: adminPassword,
        first_name: 'System',
        last_name: 'Administrator',
        role: 'admin',
        is_active: true,
        is_admin: true,
        created_at: new Date(),
        updated_at: new Date(),
        last_login: undefined,
      };

      await this.createUserInDB(adminUser);
      console.log('🔧 Admin user created: admin / admin123 (Role: admin)');

      // Manager user
      const managerId = uuidv4();
      const managerPassword = await bcrypt.hash('manager123', 12);
      
      const managerUser: User = {
        id: managerId,
        username: 'manager',
        email: 'manager@skillbox.local',
        password_hash: managerPassword,
        first_name: 'Test',
        last_name: 'Manager',
        role: 'manager',
        is_active: true,
        is_admin: false,
        created_at: new Date(),
        updated_at: new Date(),
        last_login: undefined,
      };

      await this.createUserInDB(managerUser);
      console.log('🔧 Manager user created: manager / manager123 (Role: manager)');

      // Regular user
      const userId = uuidv4();
      const userPassword = await bcrypt.hash('user123', 12);
      
      const regularUser: User = {
        id: userId,
        username: 'user',
        email: 'user@skillbox.local',
        password_hash: userPassword,
        first_name: 'Test',
        last_name: 'User',
        role: 'user',
        is_active: true,
        is_admin: false,
        created_at: new Date(),
        updated_at: new Date(),
        last_login: undefined,
      };

      await this.createUserInDB(regularUser);
      console.log('🔧 Regular user created: user / user123 (Role: user)');

    } catch (error) {
      console.error('Error creating default users:', error);
    }
  }

  private async createUserInDB(user: User): Promise<void> {
    const sql = `
      INSERT INTO users (
        id, username, email, password_hash, first_name, last_name, 
        role, is_active, is_admin, created_at, updated_at, last_login
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    return new Promise((resolve, reject) => {
      this.db.run(sql, [
        user.id, user.username, user.email, user.password_hash,
        user.first_name, user.last_name, user.role, user.is_active,
        user.is_admin, user.created_at.toISOString(), user.updated_at.toISOString(),
        user.last_login?.toISOString() || null
      ], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async create(userData: CreateUserRequest): Promise<User> {
    // Check if username or email already exists
    const existingUser = await this.findByUsernameOrEmail(userData.username, userData.email);
    if (existingUser) {
      throw new Error('Username or email already exists');
    }

    const userId = uuidv4();
    const hashedPassword = await bcrypt.hash(userData.password, 12);
    const role = userData.role || 'user';

    if (!RoleService.isValidRole(role)) {
      throw new Error(`Invalid role: ${role}`);
    }

    const user: User = {
      id: userId,
      username: userData.username,
      email: userData.email,
      password_hash: hashedPassword,
      first_name: userData.first_name,
      last_name: userData.last_name,
      role: role,
      is_active: true,
      is_admin: role === 'admin',
      created_at: new Date(),
      updated_at: new Date(),
      last_login: undefined,
    };

    await this.createUserInDB(user);
    return user;
  }

  async findById(id: string): Promise<User | null> {
    const sql = 'SELECT * FROM users WHERE id = ?';
    return new Promise((resolve, reject) => {
      this.db.get(sql, [id], (err, row: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(row ? this.mapRowToUser(row) : null);
        }
      });
    });
  }

  async findByUsername(username: string): Promise<User | null> {
    const sql = 'SELECT * FROM users WHERE username = ?';
    return new Promise((resolve, reject) => {
      this.db.get(sql, [username], (err, row: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(row ? this.mapRowToUser(row) : null);
        }
      });
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    const sql = 'SELECT * FROM users WHERE email = ?';
    return new Promise((resolve, reject) => {
      this.db.get(sql, [email], (err, row: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(row ? this.mapRowToUser(row) : null);
        }
      });
    });
  }

  private async findByUsernameOrEmail(username: string, email: string): Promise<User | null> {
    const sql = 'SELECT * FROM users WHERE username = ? OR email = ?';
    return new Promise((resolve, reject) => {
      this.db.get(sql, [username, email], (err, row: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(row ? this.mapRowToUser(row) : null);
        }
      });
    });
  }

  async verifyPassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.password_hash);
  }

  async updateLastLogin(userId: string): Promise<void> {
    const sql = 'UPDATE users SET last_login = ?, updated_at = ? WHERE id = ?';
    const now = new Date().toISOString();
    
    return new Promise((resolve, reject) => {
      this.db.run(sql, [now, now, userId], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async updatePassword(userId: string, newPassword: string): Promise<void> {
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    const sql = 'UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?';
    const now = new Date().toISOString();
    
    return new Promise((resolve, reject) => {
      this.db.run(sql, [hashedPassword, now, userId], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async update(userId: string, updates: Partial<User>): Promise<User | null> {
    const user = await this.findById(userId);
    if (!user) {
      return null;
    }

    const updatedUser = {
      ...user,
      ...updates,
      id: user.id, // Prevent ID changes
      password_hash: user.password_hash, // Prevent direct password changes
      updated_at: new Date(),
    };

    const sql = `
      UPDATE users SET 
        username = ?, email = ?, first_name = ?, last_name = ?, 
        role = ?, is_active = ?, is_admin = ?, updated_at = ?
      WHERE id = ?
    `;

    await new Promise((resolve, reject) => {
      this.db.run(sql, [
        updatedUser.username, updatedUser.email, updatedUser.first_name, updatedUser.last_name,
        updatedUser.role, updatedUser.is_active, updatedUser.is_admin, 
        updatedUser.updated_at.toISOString(), userId
      ], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes);
        }
      });
    });

    return updatedUser;
  }

  async delete(userId: string): Promise<boolean> {
    const sql = 'DELETE FROM users WHERE id = ?';
    
    return new Promise((resolve, reject) => {
      this.db.run(sql, [userId], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes > 0);
        }
      });
    });
  }

  async list(limit: number = 50, offset: number = 0): Promise<User[]> {
    const sql = 'SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?';
    
    return new Promise((resolve, reject) => {
      this.db.all(sql, [limit, offset], (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows.map(row => this.mapRowToUser(row)));
        }
      });
    });
  }

  async count(): Promise<number> {
    const sql = 'SELECT COUNT(*) as count FROM users';
    
    return new Promise((resolve, reject) => {
      this.db.get(sql, [], (err, row: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(row.count);
        }
      });
    });
  }

  // Utility method to get user without password
  getSafeUser(user: User): Omit<User, 'password_hash'> {
    const { password_hash, ...safeUser } = user;
    return safeUser;
  }

  // Role management methods
  async updateUserRole(userId: string, newRole: UserRole, updatedBy: string): Promise<User | null> {
    const user = await this.findById(userId);
    if (!user) {
      return null;
    }

    if (!RoleService.isValidRole(newRole)) {
      throw new Error(`Invalid role: ${newRole}`);
    }

    const updatedUser = await this.update(userId, {
      role: newRole,
      is_admin: newRole === 'admin'
    });

    if (updatedUser) {
      console.log(`🔧 User ${user.username} role updated from ${user.role} to ${newRole} by ${updatedBy}`);
    }
    
    return updatedUser;
  }

  async getUsersByRole(role: UserRole): Promise<User[]> {
    const sql = 'SELECT * FROM users WHERE role = ?';
    
    return new Promise((resolve, reject) => {
      this.db.all(sql, [role], (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows.map(row => this.mapRowToUser(row)));
        }
      });
    });
  }

  async getRoleStats(): Promise<Record<UserRole, number>> {
    const sql = 'SELECT role, COUNT(*) as count FROM users GROUP BY role';
    
    return new Promise((resolve, reject) => {
      this.db.all(sql, [], (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          const stats = { user: 0, manager: 0, admin: 0 };
          for (const row of rows) {
            if (row.role in stats) {
              stats[row.role as UserRole] = row.count;
            }
          }
          resolve(stats);
        }
      });
    });
  }

  userHasRoleOrHigher(user: User, requiredRole: UserRole): boolean {
    return RoleService.isRoleHigherOrEqual(user.role, requiredRole);
  }

  userHasPermission(user: User, permission: keyof RolePermissions): boolean {
    return RoleService.hasPermission(user.role, permission);
  }

  private mapRowToUser(row: any): User {
    return {
      id: row.id,
      username: row.username,
      email: row.email,
      password_hash: row.password_hash,
      first_name: row.first_name,
      last_name: row.last_name,
      role: row.role,
      is_active: Boolean(row.is_active),
      is_admin: Boolean(row.is_admin),
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
      last_login: row.last_login ? new Date(row.last_login) : undefined,
    };
  }
}

// Create singleton instance
let userModelInstance: UserModelSQLite | null = null;

export function getUserModel(db?: Database): UserModelSQLite {
  if (!userModelInstance && db) {
    userModelInstance = new UserModelSQLite(db);
  }
  if (!userModelInstance) {
    throw new Error('User model not initialized. Database connection required.');
  }
  return userModelInstance;
}

export default getUserModel; 