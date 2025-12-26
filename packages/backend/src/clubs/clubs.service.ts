import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Client as PgClient } from 'pg';
import * as bcrypt from 'bcrypt';
import { performance } from 'node:perf_hooks';
import { randomBytes, createHash } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { RegisterClubDto } from './dto/register-club.dto';
import { ClubRegistrationResponseDto } from './dto/club-registration-response.dto';
import { CheckSlugResponseDto } from './dto/check-slug-response.dto';
import { ClubEntity } from '@/database/master/entities/club.entity';
import {
  BranchEntity,
  ClubInviteEntity,
  ClubPlanEntity,
  ClubSettingEntity,
  PermissionEntity,
  RoleEntity,
  RolePermissionEntity,
  TeamEntity,
  UserEntity,
  UserRoleEntity,
  UserTokenEntity,
} from '@/database/tenant/entities';
import { CreateTenantBaseTables1731600000000 } from '@/database/tenant/migrations/1731600000000-CreateTenantBaseTables';
import { AddPasswordResetFields1731600100000 } from '@/database/tenant/migrations/1731600100000-AddPasswordResetFields';
import { AddCoverImageAndOrganizationFields1731600200000 } from '@/database/tenant/migrations/1731600200000-AddCoverImageAndOrganizationFields';
import { CreateBranchesTable1731600300000 } from '@/database/tenant/migrations/1731600300000-CreateBranchesTable';
import { encrypt, decrypt } from '@/utils/encryption.util';
import { RoleSeedService } from '@/auth/services/role-seed.service';
import { EmailService } from '@/auth/services/email.service';
import { ITenantContext } from '@/tenant/tenant.context';
import { ProvisioningMetricsService } from './services/provisioning-metrics.service';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { InviteMembersDto } from './dto/invite-members.dto';
import { UpdatePlanResponseDto } from './dto/update-plan-response.dto';

interface PlanDefinition {
  code: string;
  name: string;
  memberLimit: number;
  coachLimit: number;
  monthlyPrice: number;
}

const PLAN_CATALOG: Record<string, PlanDefinition> = {
  starter: {
    code: 'starter',
    name: 'Starter',
    memberLimit: 25,
    coachLimit: 5,
    monthlyPrice: 0,
  },
  pro: {
    code: 'pro',
    name: 'Pro',
    memberLimit: 75,
    coachLimit: 15,
    monthlyPrice: 199,
  },
  elite: {
    code: 'elite',
    name: 'Elite',
    memberLimit: 200,
    coachLimit: 40,
    monthlyPrice: 399,
  },
};

@Injectable()
export class ClubsService {
  private readonly logger = new Logger(ClubsService.name);
  private readonly defaultHost: string;
  private readonly defaultPort: number;
  private readonly defaultUser: string;
  private readonly defaultPassword: string;
  private readonly adminDatabase: string;
  private readonly poolSize: number;
  private readonly onboardingTtlMs: number;
  private readonly trialDays: number;

  constructor(
    @InjectRepository(ClubEntity)
    private readonly clubRepository: Repository<ClubEntity>,
    private readonly configService: ConfigService,
    private readonly roleSeedService: RoleSeedService,
    private readonly emailService: EmailService,
    private readonly metrics: ProvisioningMetricsService,
  ) {
    this.defaultHost =
      this.configService.get<string>('TENANT_DB_HOST') ||
      this.configService.get<string>('MASTER_DB_HOST') ||
      'localhost';
    this.defaultPort = parseInt(
      this.configService.get<string>('TENANT_DB_PORT') ||
        this.configService.get<string>('MASTER_DB_PORT') ||
        '5432',
      10,
    );
    this.defaultUser =
      this.configService.get<string>('TENANT_DB_USER') ||
      this.configService.get<string>('MASTER_DB_USER') ||
      'postgres';
    this.defaultPassword =
      this.configService.get<string>('TENANT_DB_PASSWORD') ||
      this.configService.get<string>('MASTER_DB_PASSWORD') ||
      'postgres';
    this.adminDatabase =
      this.configService.get<string>('PROVISIONING_DB_NAME') || 'postgres';
    this.poolSize = parseInt(
      this.configService.get<string>('TENANT_DB_POOL_SIZE') || '10',
      10,
    );
    const onboardingHours = parseInt(
      this.configService.get<string>('ONBOARDING_TOKEN_HOURS') || '48',
      10,
    );
    this.onboardingTtlMs = onboardingHours * 60 * 60 * 1000;
    this.trialDays = parseInt(
      this.configService.get<string>('ONBOARDING_TRIAL_DAYS') || '14',
      10,
    );
  }

  async registerClub(
    dto: RegisterClubDto,
  ): Promise<ClubRegistrationResponseDto> {
    const normalizedSubdomain = this.normalizeSubdomain(dto.subdomain);
    const plan = this.resolvePlan(dto.planCode);
    const dbName = this.buildDatabaseName(normalizedSubdomain);
    const onboardingToken = this.generateToken();
    const onboardingTokenHash = this.hashToken(onboardingToken);
    const onboardingExpiresAt = this.calculateExpiry();
    const startTime = performance.now();

    let tenantDataSource: DataSource | null = null;
    let createdDatabase = false;
    let savedClub: ClubEntity | null = null;

    try {
      await this.ensureSubdomainAvailable(normalizedSubdomain);

      savedClub = await this.createClubRecord({
        dto,
        subdomain: normalizedSubdomain,
        planCode: plan.code,
        dbName,
        onboardingTokenHash,
        onboardingExpiresAt,
      });

      await this.createTenantDatabase(dbName);
      createdDatabase = true;

      tenantDataSource = await this.createTenantDataSource(savedClub, {
        runMigrations: true,
      });
      await this.seedTenantDefaults(
        tenantDataSource,
        savedClub,
        dto,
        plan,
        normalizedSubdomain,
      );
      await tenantDataSource.destroy();
      tenantDataSource = null;

      await this.clubRepository.update(savedClub.id, {
        status: 'active',
        onboardingTokenExpiresAt: onboardingExpiresAt,
        onboardingStatus: 'pending',
      });

      // Send welcome email
      try {
        await this.emailService.sendWelcomeEmail(
          dto.adminEmail.toLowerCase(),
          dto.adminFirstName,
          dto.clubName,
          normalizedSubdomain,
        );
      } catch (emailError) {
        // Don't fail registration if email fails
        this.logger.warn(
          `Failed to send welcome email to ${dto.adminEmail}:`,
          emailError,
        );
      }

      const duration = performance.now() - startTime;
      this.metrics.record(true, duration);
      this.logger.log(
        `Provisioned club ${normalizedSubdomain} in ${Math.round(duration)}ms`,
      );

      return {
        clubId: savedClub.id,
        onboardingToken,
        subdomain: savedClub.subdomain,
        onboardingExpiresAt: onboardingExpiresAt.toISOString(),
      };
    } catch (error: unknown) {
      const normalizedError =
        error instanceof Error ? error : new Error('unknown error');
      const message = normalizedError.message || 'unknown error';
      const stack = normalizedError.stack;
      const duration = performance.now() - startTime;
      this.metrics.record(false, duration);
      this.logger.error(
        `Failed provisioning for ${normalizedSubdomain}: ${message}`,
        stack,
      );

      if (tenantDataSource?.isInitialized) {
        await tenantDataSource.destroy().catch(() => undefined);
      }

      if (createdDatabase) {
        await this.dropTenantDatabase(dbName);
      }

      if (savedClub) {
        await this.clubRepository.delete(savedClub.id).catch(() => undefined);
      }

      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }

      throw new InternalServerErrorException('Failed to provision club');
    }
  }

  async updatePlan(
    clubId: string,
    dto: UpdatePlanDto,
    onboardingToken?: string,
  ): Promise<UpdatePlanResponseDto> {
    const club = await this.getClubByIdOrFail(clubId);
    this.ensureOnboardingAccess(club, onboardingToken);
    const planDefinition = this.resolvePlan(dto.planCode);
    const normalizedBilling = dto.billingCycle.toLowerCase() as
      | 'monthly'
      | 'annual';

    const updatedPlan = await this.withTenantDataSource(
      club,
      async (dataSource) => {
        const planRepo = dataSource.getRepository(ClubPlanEntity);
        const plans = await planRepo.find({
          order: { createdAt: 'DESC' },
          take: 1,
        });
        let plan = plans[0] ?? null;

        if (!plan) {
          plan = planRepo.create();
        }

        plan.planCode = planDefinition.code;
        plan.planName = planDefinition.name;
        plan.status = 'trialing';
        plan.billingCycle = normalizedBilling;
        plan.memberLimit = planDefinition.memberLimit;
        plan.coachLimit = planDefinition.coachLimit;
        plan.monthlyPrice = planDefinition.monthlyPrice;

        return planRepo.save(plan);
      },
    );

    await this.clubRepository.update(club.id, {
      onboardingTokenExpiresAt: club.onboardingTokenExpiresAt,
    });

    return {
      planCode: updatedPlan.planCode,
      billingCycle: updatedPlan.billingCycle,
      status: updatedPlan.status,
      memberLimit: updatedPlan.memberLimit,
      coachLimit: updatedPlan.coachLimit,
    };
  }

  async checkSlugAvailability(slug: string): Promise<CheckSlugResponseDto> {
    const normalized = this.normalizeSubdomain(slug);
    const existing = await this.clubRepository.findOne({
      where: { subdomain: normalized },
    });

    return {
      available: !existing,
      exists: !!existing,
    };
  }

  async getClubBySlug(slug: string) {
    const normalized = this.normalizeSubdomain(slug);
    const club = await this.clubRepository.findOne({
      where: { subdomain: normalized },
      select: ['id', 'subdomain', 'name', 'status'],
    });

    if (!club) {
      throw new NotFoundException(`Club with slug "${slug}" not found`);
    }

    return {
      clubId: club.id,
      subdomain: club.subdomain,
      name: club.name,
      status: club.status,
    };
  }

  async inviteMembers(
    clubId: string,
    dto: InviteMembersDto,
    onboardingToken?: string,
  ) {
    const club = await this.getClubByIdOrFail(clubId);
    this.ensureOnboardingAccess(club, onboardingToken);

    const now = new Date();
    const invites = await this.withTenantDataSource<ClubInviteEntity[]>(
      club,
      async (dataSource) => {
        const inviteRepo = dataSource.getRepository(ClubInviteEntity);
        const savedInvites: ClubInviteEntity[] = [];

        for (const invite of dto.invites) {
          const email = invite.email.trim().toLowerCase();
          const entity = inviteRepo.create({
            email,
            role: invite.role,
            invitedBy: invite.invitedBy || `${club.name} Admin`,
            inviteToken: this.generateToken(),
            status: 'pending',
          });

          try {
            const saved = await inviteRepo.save(entity);
            savedInvites.push(saved);
          } catch (error: unknown) {
            if (!(error instanceof Error)) {
              throw error;
            }
            const isDuplicate = error.message.includes('duplicate');
            if (!isDuplicate) {
              throw error;
            }
            await inviteRepo.update(
              { email },
              {
                role: invite.role,
                status: 'pending',
                inviteToken: this.generateToken(),
                updatedAt: now,
              },
            );
            const existing = await inviteRepo.findOne({ where: { email } });
            if (existing) {
              savedInvites.push(existing);
            }
          }
        }

        return savedInvites;
      },
    );

    return {
      count: invites.length,
      invites: invites.map((invite) => ({
        id: invite.id,
        email: invite.email,
        role: invite.role,
        status: invite.status,
      })),
    };
  }

  async completeOnboarding(clubId: string, onboardingToken?: string) {
    const club = await this.getClubByIdOrFail(clubId);
    this.ensureOnboardingAccess(club, onboardingToken);
    const completedAt = new Date();

    await this.withTenantDataSource(club, async (dataSource) => {
      const settingsRepo = dataSource.getRepository(ClubSettingEntity);
      await settingsRepo
        .createQueryBuilder()
        .update()
        .set({
          onboardingComplete: true,
          onboardingStep: 'completed',
          onboardingCompletedAt: completedAt,
        })
        .execute();
    });

    await this.clubRepository.update(club.id, {
      onboardingStatus: 'completed',
      onboardingCompletedAt: completedAt,
      onboardingTokenHash: null,
      onboardingTokenExpiresAt: null,
    });

    return {
      completedAt,
    };
  }

  private async ensureSubdomainAvailable(subdomain: string): Promise<void> {
    const existing = await this.clubRepository.findOne({
      where: { subdomain },
    });

    if (existing) {
      throw new ConflictException(
        `subdomain ${subdomain} is already registered`,
      );
    }
  }

  private async createClubRecord(options: {
    dto: RegisterClubDto;
    subdomain: string;
    planCode: string;
    dbName: string;
    onboardingTokenHash: string;
    onboardingExpiresAt: Date;
  }): Promise<ClubEntity> {
    const {
      dto,
      subdomain,
      planCode,
      dbName,
      onboardingTokenHash,
      onboardingExpiresAt,
    } = options;

    const entity = this.clubRepository.create({
      name: dto.clubName.trim(),
      subdomain,
      dbHost: this.defaultHost,
      dbPort: this.defaultPort,
      dbName,
      dbUser: this.defaultUser,
      dbPasswordEncrypted: encrypt(this.defaultPassword),
      connectionPoolSize: this.poolSize,
      status: 'inactive',
      onboardingTokenHash,
      onboardingTokenExpiresAt: onboardingExpiresAt,
      onboardingStatus: 'pending',
    });

    const saved = await this.clubRepository.save(entity);

    this.logger.log(
      `Created club record ${saved.id} for ${subdomain} (${planCode})`,
    );

    return saved;
  }

  private async createTenantDatabase(dbName: string): Promise<void> {
    const client = new PgClient({
      host: this.defaultHost,
      port: this.defaultPort,
      user: this.defaultUser,
      password: this.defaultPassword,
      database: this.adminDatabase,
    });

    await client.connect();
    try {
      const existing = await client.query(
        'SELECT 1 FROM pg_database WHERE datname = $1',
        [dbName],
      );

      if (existing.rowCount && existing.rowCount > 0) {
        throw new ConflictException(
          `database ${dbName} already exists for another club`,
        );
      }

      await client.query(
        `CREATE DATABASE "${dbName}" WITH ENCODING 'UTF8' CONNECTION LIMIT -1`,
      );
    } finally {
      await client.end();
    }
  }

  private async dropTenantDatabase(dbName: string): Promise<void> {
    const client = new PgClient({
      host: this.defaultHost,
      port: this.defaultPort,
      user: this.defaultUser,
      password: this.defaultPassword,
      database: this.adminDatabase,
    });

    await client.connect();
    try {
      await client.query(
        `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1`,
        [dbName],
      );
      await client.query(`DROP DATABASE IF EXISTS "${dbName}"`);
    } finally {
      await client.end();
    }
  }

  async createTenantDataSource(
    club: ClubEntity,
    options?: { runMigrations?: boolean },
  ): Promise<DataSource> {
    const dataSource = new DataSource({
      type: 'postgres',
      host: club.dbHost,
      port: club.dbPort,
      username: club.dbUser,
      password: decrypt(club.dbPasswordEncrypted),
      database: club.dbName,
      poolSize: this.poolSize,
      entities: [
        UserEntity,
        UserTokenEntity,
        RoleEntity,
        PermissionEntity,
        UserRoleEntity,
        RolePermissionEntity,
        ClubPlanEntity,
        ClubSettingEntity,
        TeamEntity,
        ClubInviteEntity,
        BranchEntity,
      ],
      migrations: [
        CreateTenantBaseTables1731600000000,
        AddPasswordResetFields1731600100000,
        AddCoverImageAndOrganizationFields1731600200000,
        CreateBranchesTable1731600300000,
      ],
      synchronize: false,
      logging: process.env.NODE_ENV === 'development',
    });

    await dataSource.initialize();

    if (options?.runMigrations) {
      await dataSource.runMigrations();
    }

    return dataSource;
  }

  private async withTenantDataSource<T>(
    club: ClubEntity,
    handler: (dataSource: DataSource) => Promise<T>,
  ): Promise<T> {
    const dataSource = await this.createTenantDataSource(club);
    try {
      return await handler(dataSource);
    } finally {
      await dataSource.destroy();
    }
  }

  private async seedTenantDefaults(
    dataSource: DataSource,
    club: ClubEntity,
    dto: RegisterClubDto,
    plan: PlanDefinition,
    subdomain: string,
  ): Promise<void> {
    const tenantContext = this.buildTenantContext(club, dataSource);
    await this.roleSeedService.seedRolesAndPermissions(tenantContext);

    const userRepo = dataSource.getRepository(UserEntity);
    const roleRepo = dataSource.getRepository(RoleEntity);
    const userRoleRepo = dataSource.getRepository(UserRoleEntity);
    const planRepo = dataSource.getRepository(ClubPlanEntity);
    const settingsRepo = dataSource.getRepository(ClubSettingEntity);
    const teamRepo = dataSource.getRepository(TeamEntity);

    const passwordHash = await bcrypt.hash(dto.adminPassword, 10);
    const adminUser = await userRepo.save(
      userRepo.create({
        email: dto.adminEmail.toLowerCase(),
        password: passwordHash,
        firstName: dto.adminFirstName,
        lastName: dto.adminLastName,
      }),
    );

    const adminRole = await roleRepo.findOne({ where: { name: 'Admin' } });
    if (adminRole) {
      await userRoleRepo.save(
        userRoleRepo.create({
          userId: adminUser.id,
          roleId: adminRole.id,
        }),
      );
    }

    const trialEndsAt = new Date(Date.now() + this.trialDays * 86_400_000);
    await planRepo.save(
      planRepo.create({
        planCode: plan.code,
        planName: plan.name,
        status: 'trialing',
        billingCycle: 'monthly',
        memberLimit: plan.memberLimit,
        coachLimit: plan.coachLimit,
        monthlyPrice: plan.monthlyPrice,
        trialEndsAt,
      }),
    );

    await settingsRepo.save(
      settingsRepo.create({
        timezone: dto.timezone || 'America/New_York',
        onboardingStep: 'club-info',
        onboardingComplete: false,
        supportEmail: dto.adminEmail.toLowerCase(),
      }),
    );

    await teamRepo.save(
      teamRepo.create({
        name: `${dto.clubName} Demo Team`,
        slug: this.generateTeamSlug(subdomain),
        sport: 'soccer',
        ageGroup: 'U12',
        gender: 'coed',
        description:
          'Pre-configured demo team to showcase scheduling and roster views.',
        timezone: dto.timezone || 'America/New_York',
      }),
    );
  }

  private async getClubByIdOrFail(clubId: string): Promise<ClubEntity> {
    const club = await this.clubRepository.findOne({ where: { id: clubId } });
    if (!club) {
      throw new NotFoundException(`Club with id ${clubId} not found`);
    }
    return club;
  }

  /**
   * Get club by subdomain
   * Public method for use by other services (like AuthService)
   */
  async getClubBySubdomain(subdomain: string): Promise<ClubEntity | null> {
    return this.clubRepository.findOne({ where: { subdomain } });
  }

  /**
   * Mark onboarding as complete in master database
   * Called by AuthController after updating tenant settings
   */
  async markOnboardingComplete(clubId: string): Promise<void> {
    await this.clubRepository.update(clubId, {
      onboardingStatus: 'completed',
      onboardingCompletedAt: new Date(),
      onboardingTokenHash: null,
      onboardingTokenExpiresAt: null,
    });
  }

  private ensureOnboardingAccess(
    club: ClubEntity,
    onboardingToken?: string,
  ): void {
    if (!onboardingToken) {
      throw new UnauthorizedException('Onboarding token is required');
    }

    if (!club.onboardingTokenHash) {
      throw new BadRequestException('Onboarding is already completed');
    }

    const hashedToken = this.hashToken(onboardingToken);
    if (hashedToken !== club.onboardingTokenHash) {
      throw new UnauthorizedException('Invalid onboarding token');
    }

    if (
      club.onboardingTokenExpiresAt &&
      club.onboardingTokenExpiresAt.getTime() < Date.now()
    ) {
      throw new UnauthorizedException('Onboarding token has expired');
    }

    if (club.onboardingStatus === 'completed') {
      throw new BadRequestException('Onboarding already completed');
    }
  }

  buildTenantContext(club: ClubEntity, dataSource: DataSource): ITenantContext {
    return {
      tenantId: club.id,
      subdomain: club.subdomain,
      dataSource,
      dbConfig: {
        host: club.dbHost,
        port: club.dbPort,
        database: club.dbName,
        username: club.dbUser,
        password: decrypt(club.dbPasswordEncrypted),
        poolSize: club.connectionPoolSize || this.poolSize,
      },
      metadata: {
        id: club.id,
        subdomain: club.subdomain,
        name: club.name,
        dbHost: club.dbHost,
        dbPort: club.dbPort,
        dbName: club.dbName,
        dbUser: club.dbUser,
        dbPasswordEncrypted: club.dbPasswordEncrypted,
        connectionPoolSize: club.connectionPoolSize,
        status: club.status,
        onboardingStatus: club.onboardingStatus,
        onboardingTokenExpiresAt: club.onboardingTokenExpiresAt,
        onboardingCompletedAt: club.onboardingCompletedAt,
        createdAt: club.createdAt,
        updatedAt: club.updatedAt,
      },
    };
  }

  private resolvePlan(planCode?: string): PlanDefinition {
    const normalized = (planCode || 'starter').toLowerCase();
    return PLAN_CATALOG[normalized] || PLAN_CATALOG.starter;
  }

  private normalizeSubdomain(subdomain: string): string {
    if (!subdomain) {
      throw new BadRequestException('subdomain is required');
    }

    const normalized = subdomain.trim().toLowerCase();
    const isValid = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized);

    if (!isValid) {
      throw new BadRequestException(
        'subdomain must be kebab-case and only contain lowercase letters, numbers, and hyphens',
      );
    }

    return normalized;
  }

  private buildDatabaseName(subdomain: string): string {
    return `cms_club_${subdomain}`;
  }

  private generateToken(): string {
    return randomBytes(32).toString('hex');
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private calculateExpiry(): Date {
    return new Date(Date.now() + this.onboardingTtlMs);
  }

  private generateTeamSlug(subdomain: string): string {
    return `${subdomain}-demo-team`;
  }
}
