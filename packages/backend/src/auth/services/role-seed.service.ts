import { Injectable, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ITenantContext } from '@/tenant/tenant.context';
import {
  RoleEntity,
  PermissionEntity,
  RolePermissionEntity,
} from '@/database/tenant/entities';
import { PermissionService } from './permission.service';

@Injectable()
export class RoleSeedService {
  private readonly logger = new Logger(RoleSeedService.name);

  constructor(private readonly permissionService: PermissionService) {}

  /**
   * Check if roles and permissions are already seeded
   */
  async isSeeded(tenantContext: ITenantContext): Promise<boolean> {
    const { dataSource } = tenantContext;
    const roleRepo = dataSource.getRepository(RoleEntity);

    // Check if Admin role exists (indicates seeding was done)
    const adminRole = await roleRepo.findOne({ where: { name: 'Admin' } });
    return !!adminRole;
  }

  /**
   * Seed default roles and permissions for a tenant database
   */
  async seedRolesAndPermissions(tenantContext: ITenantContext): Promise<void> {
    const { dataSource } = tenantContext;

    const roleRepo = dataSource.getRepository(RoleEntity);
    const permissionRepo = dataSource.getRepository(PermissionEntity);
    const rolePermissionRepo = dataSource.getRepository(RolePermissionEntity);

    // Seed permissions first
    const permissions = await this.seedPermissions(permissionRepo);

    // Seed roles
    const roles = await this.seedRoles(roleRepo);

    // Assign permissions to roles
    await this.assignPermissionsToRoles(rolePermissionRepo, roles, permissions);

    this.logger.log(
      `Successfully seeded ${roles.size} roles and ${permissions.size} permissions for tenant ${tenantContext.tenantId}`,
    );
  }

  /**
   * Seed roles and permissions if not already seeded
   * This is safe to call multiple times - it will only seed if needed
   */
  async seedIfNeeded(tenantContext: ITenantContext): Promise<void> {
    const isAlreadySeeded = await this.isSeeded(tenantContext);

    if (isAlreadySeeded) {
      this.logger.debug(
        `Roles and permissions already seeded for tenant ${tenantContext.tenantId}`,
      );
      return;
    }

    this.logger.log(
      `Seeding roles and permissions for tenant ${tenantContext.tenantId}...`,
    );
    await this.seedRolesAndPermissions(tenantContext);
  }

  /**
   * Seed permissions from module-actions.json
   */
  private async seedPermissions(
    permissionRepo: Repository<PermissionEntity>,
  ): Promise<Map<string, PermissionEntity>> {
    const moduleActions = this.permissionService.getModuleActions();
    const permissionsMap = new Map<string, PermissionEntity>();

    if (!moduleActions) {
      this.logger.warn(
        'Module actions not loaded, skipping permission seeding',
      );
      return permissionsMap;
    }

    for (const perm of moduleActions.permissions) {
      let permission = await permissionRepo.findOne({
        where: { name: perm.name },
      });

      if (!permission) {
        permission = permissionRepo.create({
          name: perm.name,
          module: perm.module,
          action: perm.action,
          description: perm.description,
        });
        permission = await permissionRepo.save(permission);
        this.logger.debug(`Created permission: ${perm.name}`);
      }

      permissionsMap.set(perm.name, permission);
    }

    return permissionsMap;
  }

  /**
   * Seed default roles
   */
  private async seedRoles(
    roleRepo: Repository<RoleEntity>,
  ): Promise<Map<string, RoleEntity>> {
    const rolesMap = new Map<string, RoleEntity>();

    const defaultRoles = [
      {
        name: 'Admin',
        description: 'Full system access with all permissions',
      },
      {
        name: 'Coach',
        description: 'Can manage teams, calendar, and training',
      },
      {
        name: 'Parent',
        description: 'Read-only access to team information',
      },
      {
        name: 'Player',
        description: 'Read-only access to team information',
      },
      {
        name: 'Staff',
        description: 'Can manage calendar and communication',
      },
    ];

    for (const roleData of defaultRoles) {
      let role = await roleRepo.findOne({ where: { name: roleData.name } });

      if (!role) {
        role = roleRepo.create({
          name: roleData.name,
          description: roleData.description,
        });
        role = await roleRepo.save(role);
        this.logger.debug(`Created role: ${roleData.name}`);
      }

      rolesMap.set(roleData.name, role);
    }

    return rolesMap;
  }

  /**
   * Assign permissions to roles
   */
  private async assignPermissionsToRoles(
    rolePermissionRepo: Repository<RolePermissionEntity>,
    roles: Map<string, RoleEntity>,
    permissions: Map<string, PermissionEntity>,
  ): Promise<void> {
    // Admin: All permissions
    const adminRole = roles.get('Admin');
    if (adminRole) {
      for (const permission of permissions.values()) {
        await this.ensureRolePermission(
          rolePermissionRepo,
          adminRole.id,
          permission.id,
        );
      }
    }

    // Coach: Team, Calendar, Communication, Development, Scheduling, Settings
    const coachRole = roles.get('Coach');
    if (coachRole) {
      const coachPermissions = [
        'team.read',
        'team.write',
        'team.delete',
        'calendar.read',
        'calendar.write',
        'calendar.delete',
        'communication.read',
        'communication.write',
        'communication.delete',
        'development.read',
        'development.write',
        'development.delete',
        'scheduling.read',
        'scheduling.write',
        'scheduling.delete',
        'settings.read',
        'settings.write',
      ];

      for (const permName of coachPermissions) {
        const permission = permissions.get(permName);
        if (permission) {
          await this.ensureRolePermission(
            rolePermissionRepo,
            coachRole.id,
            permission.id,
          );
        }
      }
    }

    // Parent: Read-only access
    const parentRole = roles.get('Parent');
    if (parentRole) {
      const parentPermissions = [
        'team.read',
        'calendar.read',
        'communication.read',
        'development.read',
        'scheduling.read',
      ];

      for (const permName of parentPermissions) {
        const permission = permissions.get(permName);
        if (permission) {
          await this.ensureRolePermission(
            rolePermissionRepo,
            parentRole.id,
            permission.id,
          );
        }
      }
    }

    // Player: Read-only access
    const playerRole = roles.get('Player');
    if (playerRole) {
      const playerPermissions = [
        'team.read',
        'calendar.read',
        'communication.read',
        'development.read',
        'scheduling.read',
      ];

      for (const permName of playerPermissions) {
        const permission = permissions.get(permName);
        if (permission) {
          await this.ensureRolePermission(
            rolePermissionRepo,
            playerRole.id,
            permission.id,
          );
        }
      }
    }

    // Staff: Calendar, Communication, Scheduling, Administration, Settings
    const staffRole = roles.get('Staff');
    if (staffRole) {
      const staffPermissions = [
        'calendar.read',
        'calendar.write',
        'calendar.delete',
        'communication.read',
        'communication.write',
        'communication.delete',
        'scheduling.read',
        'scheduling.write',
        'scheduling.delete',
        'administration.read',
        'administration.write',
        'settings.read',
        'settings.write',
      ];

      for (const permName of staffPermissions) {
        const permission = permissions.get(permName);
        if (permission) {
          await this.ensureRolePermission(
            rolePermissionRepo,
            staffRole.id,
            permission.id,
          );
        }
      }
    }
  }

  /**
   * Ensure a role-permission relationship exists
   */
  private async ensureRolePermission(
    rolePermissionRepo: Repository<RolePermissionEntity>,
    roleId: string,
    permissionId: string,
  ): Promise<void> {
    const existing = await rolePermissionRepo.findOne({
      where: { roleId, permissionId },
    });

    if (!existing) {
      const rolePermission = rolePermissionRepo.create({
        roleId,
        permissionId,
      });
      await rolePermissionRepo.save(rolePermission);
    }
  }
}
