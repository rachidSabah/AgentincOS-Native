// ============================================================
// AgenticOS-V2 — Role-Based Access Control (RBAC) Engine
// Manages user roles, permissions, and access control
// ============================================================

import { db } from './db';

// ─── Types ─────────────────────────────────────────────────

export type UserRole = 'admin' | 'operator' | 'developer' | 'viewer' | 'guest';

export type Resource =
  | 'kernel' | 'agents' | 'models' | 'memory' | 'knowledge'
  | 'artifacts' | 'terminal' | 'browser' | 'settings' | 'users';

export type Action = 'read' | 'write' | 'delete' | 'execute' | 'use' | 'manage' | '*';

export interface RoleDefinition {
  name: string;
  isDefault: boolean;
  permissions: string[];
  description: string;
}

export interface PermissionCheck {
  userId: string;
  resource: string;
  action: string;
  granted: boolean;
  reason?: string;
}

// ─── Predefined Role Permissions ───────────────────────────
// Wildcard format: resource.action (e.g., "agents.*", "kernel.read")
// "*" means all resources or all actions depending on position

const PREDEFINED_ROLES: Record<UserRole, Omit<RoleDefinition, 'name'>> = {
  admin: {
    isDefault: true,
    permissions: [
      'kernel.*', 'agents.*', 'models.*', 'memory.*', 'knowledge.*',
      'artifacts.*', 'terminal.*', 'browser.*', 'settings.*', 'users.*',
    ],
    description: 'Full system access — all resources and actions',
  },
  operator: {
    isDefault: true,
    permissions: [
      'kernel.read', 'agents.*', 'models.*', 'memory.read',
      'knowledge.*', 'terminal.*', 'browser.*',
    ],
    description: 'Operational access — can manage agents, models, and run tools',
  },
  developer: {
    isDefault: true,
    permissions: [
      'agents.*', 'models.use', 'memory.*', 'knowledge.*',
      'artifacts.*', 'terminal.*', 'browser.*',
    ],
    description: 'Developer access — can build with agents, memory, and tools',
  },
  viewer: {
    isDefault: true,
    permissions: [
      'kernel.read', 'agents.read', 'models.read', 'memory.read',
      'knowledge.read', 'artifacts.read', 'terminal.read', 'browser.read',
      'settings.read', 'users.read',
    ],
    description: 'Read-only access across all resources',
  },
  guest: {
    isDefault: true,
    permissions: [
      'agents.use', 'models.use',
    ],
    description: 'Guest access — chat only, basic model interaction',
  },
};

// ─── RBAC Engine ───────────────────────────────────────────

class RBACEngine {
  private customRoles: Map<string, RoleDefinition> = new Map();
  private userRoles: Map<string, Set<UserRole>> = new Map();
  private initialized = false;

  // ─── Initialization ────────────────────────────────────

  /**
   * Initialize the RBAC engine, loading custom roles from DB.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Load custom roles from database
      const customRoles = await db.customRole.findMany();
      for (const role of customRoles) {
        const permissions = JSON.parse(role.permissions) as string[];
        this.customRoles.set(role.name, {
          name: role.name,
          isDefault: false,
          permissions,
          description: `Custom role created by ${role.createdBy ?? 'unknown'}`,
        });
      }

      // Load user-role assignments from user records
      const users = await db.user.findMany({
        select: { id: true, role: true },
      });
      for (const user of users) {
        const roles = this.userRoles.get(user.id) ?? new Set();
        roles.add(user.role as UserRole);
        this.userRoles.set(user.id, roles);
      }

      this.initialized = true;
      console.log('[rbac] Engine initialized with', customRoles.length, 'custom roles');
    } catch (err) {
      console.warn('[rbac] Failed to initialize from DB, using in-memory only:', err);
      this.initialized = true;
    }
  }

  // ─── Permission Checking ───────────────────────────────

  /**
   * Check if a user has permission to perform an action on a resource.
   */
  async checkPermission(userId: string, resource: string, action: string): Promise<boolean> {
    await this.ensureInitialized();

    const permissions = await this.getEffectivePermissions(userId);
    return this.matchPermission(permissions, resource, action);
  }

  /**
   * Match a resource+action against a list of permission patterns.
   */
  private matchPermission(permissions: string[], resource: string, action: string): boolean {
    for (const perm of permissions) {
      const [permResource, permAction] = perm.split('.');

      // Check if resource matches (support wildcard)
      const resourceMatch = permResource === '*' || permResource === resource;
      if (!resourceMatch) continue;

      // Check if action matches (support wildcard)
      const actionMatch = permAction === '*' || permAction === action;
      if (actionMatch) return true;
    }

    return false;
  }

  // ─── Role Management ──────────────────────────────────

  /**
   * Grant a role to a user.
   */
  async grantRole(userId: string, role: UserRole | string): Promise<void> {
    await this.ensureInitialized();

    // Validate role exists
    const roleDef = this.getRoleDefinition(role);
    if (!roleDef) {
      throw new Error(`Unknown role: ${role}`);
    }

    // Add role to user's role set
    const roles = this.userRoles.get(userId) ?? new Set();
    roles.add(role as UserRole);
    this.userRoles.set(userId, roles);

    // Update user record in DB
    try {
      await db.user.update({
        where: { id: userId },
        data: { role },
      });
    } catch {
      console.warn('[rbac] Failed to update user role in DB');
    }
  }

  /**
   * Revoke a role from a user.
   */
  async revokeRole(userId: string, role: UserRole | string): Promise<void> {
    await this.ensureInitialized();

    const roles = this.userRoles.get(userId);
    if (!roles) return;

    roles.delete(role as UserRole);

    // If user has no roles left, assign viewer as fallback
    if (roles.size === 0) {
      roles.add('viewer');
    }

    // Update DB — use the highest-privilege remaining role
    const primaryRole = this.getPrimaryRole(roles);
    try {
      await db.user.update({
        where: { id: userId },
        data: { role: primaryRole },
      });
    } catch {
      console.warn('[rbac] Failed to revoke role in DB');
    }
  }

  /**
   * Get the primary (highest-privilege) role from a set of roles.
   */
  private getPrimaryRole(roles: Set<string>): string {
    const precedence: UserRole[] = ['admin', 'operator', 'developer', 'viewer', 'guest'];
    for (const role of precedence) {
      if (roles.has(role)) return role;
    }
    return 'viewer';
  }

  /**
   * Get all permissions for a user based on their roles.
   */
  async getPermissions(userId: string): Promise<string[]> {
    await this.ensureInitialized();

    const roles = this.userRoles.get(userId);
    if (!roles || roles.size === 0) return [];

    const permissions: string[] = [];
    for (const role of roles) {
      const roleDef = this.getRoleDefinition(role);
      if (roleDef) {
        permissions.push(...roleDef.permissions);
      }
    }

    // Deduplicate
    return [...new Set(permissions)];
  }

  /**
   * Get effective permissions including custom role permissions.
   * Also checks individual permission overrides from the Permission table.
   */
  async getEffectivePermissions(userId: string): Promise<string[]> {
    await this.ensureInitialized();

    // Start with role-based permissions
    const rolePermissions = await this.getPermissions(userId);
    const effectiveSet = new Set(rolePermissions);

    // Apply individual permission overrides from DB
    try {
      const overrides = await db.permission.findMany({
        where: { userId },
      });

      for (const override of overrides) {
        const permString = `${override.resource}.${override.action}`;
        if (override.granted) {
          effectiveSet.add(permString);
        } else {
          effectiveSet.delete(permString);
        }
      }
    } catch {
      // DB not available, use role permissions only
    }

    return Array.from(effectiveSet);
  }

  // ─── Role Listing ─────────────────────────────────────

  /**
   * List all available roles (predefined + custom).
   */
  async listRoles(): Promise<RoleDefinition[]> {
    await this.ensureInitialized();

    const roles: RoleDefinition[] = [];

    // Add predefined roles
    for (const [name, def] of Object.entries(PREDEFINED_ROLES)) {
      roles.push({ name, ...def });
    }

    // Add custom roles
    for (const [, def] of this.customRoles) {
      roles.push(def);
    }

    return roles;
  }

  // ─── Custom Role Management ───────────────────────────

  /**
   * Create a custom role with specific permissions.
   */
  async createCustomRole(name: string, permissions: string[], createdBy?: string): Promise<RoleDefinition> {
    await this.ensureInitialized();

    // Validate name doesn't conflict with predefined roles
    if (name in PREDEFINED_ROLES) {
      throw new Error(`Cannot create custom role with reserved name: ${name}`);
    }

    // Validate permission format
    for (const perm of permissions) {
      if (!perm.includes('.')) {
        throw new Error(`Invalid permission format: ${perm}. Expected "resource.action"`);
      }
    }

    const roleDef: RoleDefinition = {
      name,
      isDefault: false,
      permissions,
      description: `Custom role created by ${createdBy ?? 'unknown'}`,
    };

    // Store in memory
    this.customRoles.set(name, roleDef);

    // Persist to DB
    try {
      await db.customRole.upsert({
        where: { name },
        create: {
          name,
          permissions: JSON.stringify(permissions),
          createdBy,
        },
        update: {
          permissions: JSON.stringify(permissions),
        },
      });
    } catch {
      console.warn('[rbac] Failed to persist custom role to DB');
    }

    return roleDef;
  }

  /**
   * Delete a custom role.
   */
  async deleteCustomRole(name: string): Promise<void> {
    await this.ensureInitialized();

    if (name in PREDEFINED_ROLES) {
      throw new Error(`Cannot delete predefined role: ${name}`);
    }

    this.customRoles.delete(name);

    try {
      await db.customRole.delete({
        where: { name },
      });
    } catch {
      console.warn('[rbac] Failed to delete custom role from DB');
    }
  }

  // ─── Helper Methods ───────────────────────────────────

  /**
   * Get the role definition for a role name.
   */
  private getRoleDefinition(role: string): RoleDefinition | null {
    // Check predefined roles
    if (role in PREDEFINED_ROLES) {
      const def = PREDEFINED_ROLES[role as UserRole];
      return { name: role, ...def };
    }

    // Check custom roles
    return this.customRoles.get(role) ?? null;
  }

  /**
   * Ensure the engine is initialized before use.
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Get all resources that a user can access with a specific action.
   */
  async getAccessibleResources(userId: string, action: Action): Promise<Resource[]> {
    const permissions = await this.getEffectivePermissions(userId);
    const resources: Resource[] = [];
    const allResources: Resource[] = [
      'kernel', 'agents', 'models', 'memory', 'knowledge',
      'artifacts', 'terminal', 'browser', 'settings', 'users',
    ];

    for (const resource of allResources) {
      if (this.matchPermission(permissions, resource, action)) {
        resources.push(resource);
      }
    }

    return resources;
  }

  /**
   * Check if a user has a specific role.
   */
  async hasRole(userId: string, role: string): Promise<boolean> {
    await this.ensureInitialized();
    const roles = this.userRoles.get(userId);
    return roles?.has(role as UserRole) ?? false;
  }

  /**
   * Get all roles assigned to a user.
   */
  async getUserRoles(userId: string): Promise<string[]> {
    await this.ensureInitialized();
    const roles = this.userRoles.get(userId);
    return roles ? Array.from(roles) : [];
  }
}

// ─── Singleton Export ───
export const rbacEngine = new RBACEngine();
