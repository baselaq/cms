import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ITenantContext } from '@/tenant/tenant.context';
import {
  UserRoleEntity,
  RolePermissionEntity,
} from '@/database/tenant/entities';

interface RolePermissionRaw {
  permissionName: string;
}

interface UserRoleRaw {
  roleName: string;
}

interface ModuleActionsConfig {
  permissions: Array<{
    name: string;
    module: string;
    action: string;
    description: string;
  }>;
}

@Injectable()
export class PermissionService implements OnModuleInit {
  private readonly logger = new Logger(PermissionService.name);
  private cachedModuleActions: ModuleActionsConfig | null = null;

  onModuleInit() {
    this.loadModuleActions();
  }

  /**
   * Load module-actions configuration from JSON file
   */
  private loadModuleActions(): void {
    try {
      // Get project root (works in both dev and production)
      const projectRoot = process.cwd();

      // Try multiple possible paths
      const possiblePaths = [
        // Production: dist folder (if JSON was copied)
        join(
          projectRoot,
          'dist',
          'src',
          'auth',
          'config',
          'module-actions.json',
        ),
        // Development: src folder
        join(projectRoot, 'src', 'auth', 'config', 'module-actions.json'),
        // Relative to current file location (works in dev)
        join(__dirname, '../config/module-actions.json'),
        // Fallback: relative from dist
        join(__dirname, '../../auth/config/module-actions.json'),
      ];

      let configPath: string | null = null;

      // Try each path until we find the file
      for (const path of possiblePaths) {
        try {
          readFileSync(path, 'utf-8');
          configPath = path;
          break;
        } catch {
          // Continue to next path
        }
      }

      if (!configPath) {
        throw new Error(
          `module-actions.json not found in any of these locations: ${possiblePaths.join(', ')}`,
        );
      }

      const fileContent = readFileSync(configPath, 'utf-8');
      this.cachedModuleActions = JSON.parse(fileContent) as ModuleActionsConfig;
      this.logger.log(
        `Loaded ${this.cachedModuleActions.permissions.length} permissions from module-actions.json (${configPath})`,
      );
    } catch (error) {
      this.logger.error(
        'Failed to load module-actions.json, falling back to database queries',
        error,
      );
    }
  }

  /**
   * Check if a user has a specific role
   */
  async hasRole(
    tenantContext: ITenantContext,
    userId: string,
    roleName: string,
  ): Promise<boolean> {
    const { dataSource } = tenantContext;
    const userRoleRepo = dataSource.getRepository(UserRoleEntity);

    const userRole = await userRoleRepo
      .createQueryBuilder('ur')
      .innerJoin('ur.role', 'role')
      .where('ur.userId = :userId', { userId })
      .andWhere('role.name = :roleName', { roleName })
      .getOne();

    return !!userRole;
  }

  /**
   * Check if a user has a specific permission
   */
  async hasPermission(
    tenantContext: ITenantContext,
    userId: string,
    permissionName: string,
  ): Promise<boolean> {
    const { dataSource } = tenantContext;
    const rolePermissionRepo = dataSource.getRepository(RolePermissionEntity);
    const userRoleRepo = dataSource.getRepository(UserRoleEntity);

    // Get user's roles
    const userRoles = await userRoleRepo.find({
      where: { userId },
      relations: ['role'],
    });

    if (userRoles.length === 0) {
      return false;
    }

    const roleIds = userRoles.map((ur) => ur.roleId);

    // Check if any of the user's roles have this permission
    const hasPermission = await rolePermissionRepo
      .createQueryBuilder('rp')
      .innerJoin('rp.permission', 'permission')
      .where('rp.roleId IN (:...roleIds)', { roleIds })
      .andWhere('permission.name = :permissionName', { permissionName })
      .getOne();

    return !!hasPermission;
  }

  /**
   * Get all permissions for a user
   */
  async getUserPermissions(
    tenantContext: ITenantContext,
    userId: string,
  ): Promise<string[]> {
    const { dataSource } = tenantContext;
    const rolePermissionRepo = dataSource.getRepository(RolePermissionEntity);
    const userRoleRepo = dataSource.getRepository(UserRoleEntity);

    // Get user's roles
    const userRoles = await userRoleRepo.find({
      where: { userId },
    });

    if (userRoles.length === 0) {
      return [];
    }

    const roleIds = userRoles.map((ur) => ur.roleId);

    // Get all permissions for user's roles
    const rolePermissions = await rolePermissionRepo
      .createQueryBuilder('rp')
      .innerJoin('rp.permission', 'permission')
      .where('rp.roleId IN (:...roleIds)', { roleIds })
      .select('permission.name', 'permissionName')
      .distinct(true)
      .getRawMany<RolePermissionRaw>();

    return rolePermissions.map((rp) => rp.permissionName);
  }

  /**
   * Get all roles for a user
   */
  async getUserRoles(
    tenantContext: ITenantContext,
    userId: string,
  ): Promise<string[]> {
    const { dataSource } = tenantContext;
    const userRoleRepo = dataSource.getRepository(UserRoleEntity);

    const userRoles = await userRoleRepo
      .createQueryBuilder('ur')
      .innerJoin('ur.role', 'role')
      .where('ur.userId = :userId', { userId })
      .select('role.name', 'roleName')
      .getRawMany<UserRoleRaw>();

    return userRoles.map((ur) => ur.roleName);
  }

  /**
   * Get all available permissions from module-actions.json
   */
  getAvailablePermissions(): string[] {
    if (!this.cachedModuleActions) {
      return [];
    }
    return this.cachedModuleActions.permissions.map((p) => p.name);
  }

  /**
   * Get module-actions configuration
   */
  getModuleActions(): ModuleActionsConfig | null {
    return this.cachedModuleActions;
  }
}
