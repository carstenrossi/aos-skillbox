import { User, CreateUserRequest, UserRole, RolePermissions } from '../types';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import RoleService from '../services/roleService';

// In-Memory User Storage (später durch echte DB ersetzen)
class UserModel {
  private users: Map<string, User> = new Map();

  constructor() {
    // Dummy users für Tests erstellen
    this.createDefaultUsers();
  }

  private async createDefaultUsers(): Promise<void> {
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
      is_admin: true, // Backward compatibility
      created_at: new Date(),
      updated_at: new Date(),
      last_login: undefined,
    };

    this.users.set(adminId, adminUser);
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

    this.users.set(managerId, managerUser);
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

    this.users.set(userId, regularUser);
    console.log('🔧 Regular user created: user / user123 (Role: user)');
  }

  async create(userData: CreateUserRequest): Promise<User> {
    // Check if username or email already exists
    const existingUser = this.findByUsernameOrEmail(userData.username, userData.email);
    if (existingUser) {
      throw new Error('Username or email already exists');
    }

    const userId = uuidv4();
    const hashedPassword = await bcrypt.hash(userData.password, 12);

    // Default role is 'user' if not specified
    const role = userData.role || 'user';

    // Validate role
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
      is_admin: role === 'admin', // Backward compatibility
      created_at: new Date(),
      updated_at: new Date(),
      last_login: undefined,
    };

    this.users.set(userId, user);
    return user;
  }

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async findByUsername(username: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.username === username) {
        return user;
      }
    }
    return null;
  }

  async findByEmail(email: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user;
      }
    }
    return null;
  }

  private findByUsernameOrEmail(username: string, email: string): User | null {
    for (const user of this.users.values()) {
      if (user.username === username || user.email === email) {
        return user;
      }
    }
    return null;
  }

  async verifyPassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.password_hash);
  }

  async updateLastLogin(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.last_login = new Date();
      user.updated_at = new Date();
      this.users.set(userId, user);
    }
  }

  async updatePassword(userId: string, newPassword: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.password_hash = await bcrypt.hash(newPassword, 12);
      user.updated_at = new Date();
      this.users.set(userId, user);
    }
  }

  async update(userId: string, updates: Partial<User>): Promise<User | null> {
    const user = this.users.get(userId);
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

    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async delete(userId: string): Promise<boolean> {
    return this.users.delete(userId);
  }

  async list(limit: number = 50, offset: number = 0): Promise<User[]> {
    const allUsers = Array.from(this.users.values());
    return allUsers.slice(offset, offset + limit);
  }

  async count(): Promise<number> {
    return this.users.size;
  }

  // Utility method to get user without password
  getSafeUser(user: User): Omit<User, 'password_hash'> {
    const { password_hash, ...safeUser } = user;
    return safeUser;
  }

  // Role management methods
  async updateUserRole(userId: string, newRole: UserRole, updatedBy: string): Promise<User | null> {
    const user = this.users.get(userId);
    if (!user) {
      return null;
    }

    // Validate role
    if (!RoleService.isValidRole(newRole)) {
      throw new Error(`Invalid role: ${newRole}`);
    }

    const updatedUser = {
      ...user,
      role: newRole,
      is_admin: newRole === 'admin', // Backward compatibility
      updated_at: new Date(),
    };

    this.users.set(userId, updatedUser);
    console.log(`🔧 User ${user.username} role updated from ${user.role} to ${newRole} by ${updatedBy}`);
    
    return updatedUser;
  }

  async getUsersByRole(role: UserRole): Promise<User[]> {
    const users = Array.from(this.users.values());
    return users.filter(user => user.role === role);
  }

  async getRoleStats(): Promise<Record<UserRole, number>> {
    const users = Array.from(this.users.values());
    const stats: Record<UserRole, number> = {
      user: 0,
      manager: 0,
      admin: 0
    };

    users.forEach(user => {
      stats[user.role]++;
    });

    return stats;
  }

  // Check if user has specific role or higher
  userHasRoleOrHigher(user: User, requiredRole: UserRole): boolean {
    return RoleService.isRoleHigherOrEqual(user.role, requiredRole);
  }

  // Check if user has specific permission
  userHasPermission(user: User, permission: keyof RolePermissions): boolean {
    return RoleService.hasPermission(user.role, permission);
  }
}

// Singleton instance
export const userModel = new UserModel();
export default userModel; 