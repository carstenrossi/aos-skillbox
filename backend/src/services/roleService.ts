import { UserRole, RolePermissions } from '../types';

/**
 * Role-based access control service
 * Definiert Berechtigungen für verschiedene Benutzerrollen
 */
export class RoleService {
  
  // Berechtigungen für jede Rolle
  private static readonly rolePermissions: Record<UserRole, RolePermissions> = {
    user: {
      canCreateSkillbox: false,
      canManageUsers: false,
      canManageAllSkillboxes: false,
      canViewAnalytics: false,
      canManageSystemSettings: false,
      canDeleteUsers: false,
      canPromoteUsers: false,
      maxSkillboxes: 0, // Kann keine eigenen Skillboxes erstellen
      maxUsersPerSkillbox: 0
    },
    manager: {
      canCreateSkillbox: true,
      canManageUsers: true, // Kann Benutzer in eigenen Skillboxes verwalten
      canManageAllSkillboxes: false,
      canViewAnalytics: true, // Analytics für eigene Skillboxes
      canManageSystemSettings: false,
      canDeleteUsers: false, // Kann keine Benutzer löschen
      canPromoteUsers: false, // Kann keine Benutzer befördern
      maxSkillboxes: 5, // Kann bis zu 5 Skillboxes erstellen
      maxUsersPerSkillbox: 100
    },
    admin: {
      canCreateSkillbox: true,
      canManageUsers: true,
      canManageAllSkillboxes: true,
      canViewAnalytics: true,
      canManageSystemSettings: true,
      canDeleteUsers: true,
      canPromoteUsers: true,
      maxSkillboxes: -1, // Unlimited
      maxUsersPerSkillbox: -1 // Unlimited
    }
  };

  /**
   * Hole die Berechtigungen für eine bestimmte Rolle
   */
  static getPermissions(role: UserRole): RolePermissions {
    return this.rolePermissions[role];
  }

  /**
   * Überprüfe ob eine Rolle eine bestimmte Berechtigung hat
   */
  static hasPermission(role: UserRole, permission: keyof RolePermissions): boolean {
    const permissions = this.getPermissions(role);
    const value = permissions[permission];
    
    // Für boolean-Werte
    if (typeof value === 'boolean') {
      return value;
    }
    
    // Für numerische Werte (Limits)
    if (typeof value === 'number') {
      return value > 0 || value === -1; // -1 bedeutet unlimited
    }
    
    return false;
  }

  /**
   * Überprüfe ob eine Rolle höher oder gleich einer anderen Rolle ist
   */
  static isRoleHigherOrEqual(userRole: UserRole, requiredRole: UserRole): boolean {
    const roleHierarchy: Record<UserRole, number> = {
      user: 1,
      manager: 2,
      admin: 3
    };

    return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
  }

  /**
   * Überprüfe ob eine Rolle eine andere Rolle zuweisen kann
   */
  static canAssignRole(assignerRole: UserRole, targetRole: UserRole): boolean {
    // Nur Admins können Rollen zuweisen
    if (assignerRole !== 'admin') {
      return false;
    }

    // Admins können alle Rollen zuweisen
    return true;
  }

  /**
   * Hole die verfügbaren Rollen die ein Benutzer zuweisen kann
   */
  static getAssignableRoles(assignerRole: UserRole): UserRole[] {
    switch (assignerRole) {
      case 'admin':
        return ['user', 'manager', 'admin'];
      case 'manager':
        return []; // Manager können keine Rollen zuweisen
      case 'user':
        return []; // User können keine Rollen zuweisen
      default:
        return [];
    }
  }

  /**
   * Validiere ob eine Rolle gültig ist
   */
  static isValidRole(role: string): role is UserRole {
    return ['user', 'manager', 'admin'].includes(role as UserRole);
  }

  /**
   * Hole den Display-Namen für eine Rolle (in Deutsch)
   */
  static getRoleDisplayName(role: UserRole): string {
    const displayNames: Record<UserRole, string> = {
      user: 'Benutzer',
      manager: 'Manager',
      admin: 'Administrator'
    };

    return displayNames[role] || role;
  }

  /**
   * Hole die Rollenbeschreibung (in Deutsch)
   */
  static getRoleDescription(role: UserRole): string {
    const descriptions: Record<UserRole, string> = {
      user: 'Kann Skillboxes nutzen und an Chats teilnehmen',
      manager: 'Kann eigene Skillboxes erstellen und verwalten, Analytics einsehen',
      admin: 'Vollzugriff auf alle Funktionen und Systemverwaltung'
    };

    return descriptions[role] || '';
  }

  /**
   * Überprüfe Limits für eine Rolle
   */
  static checkLimit(role: UserRole, limitType: 'maxSkillboxes' | 'maxUsersPerSkillbox', currentCount: number): boolean {
    const permissions = this.getPermissions(role);
    const limit = permissions[limitType];
    
    // -1 bedeutet unlimited
    if (limit === -1) {
      return true;
    }
    
    return currentCount < limit;
  }

  /**
   * Konvertiere alte is_admin Boolean zu neuer Rolle
   */
  static convertLegacyRole(isAdmin: boolean): UserRole {
    return isAdmin ? 'admin' : 'user';
  }
}

export default RoleService; 