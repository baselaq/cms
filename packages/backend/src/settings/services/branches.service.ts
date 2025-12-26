import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ITenantContext } from '../../tenant/tenant.context';
import { BranchEntity } from '../../database/tenant/entities/branch.entity';

export interface CreateBranchDto {
  slug: string;
  name: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  timezone?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export interface UpdateBranchDto extends Partial<CreateBranchDto> {
  id: string;
}

@Injectable()
export class BranchesService {
  private readonly logger = new Logger(BranchesService.name);

  /**
   * Get all branches
   */
  async getBranches(
    tenantContext: ITenantContext,
  ): Promise<BranchEntity[]> {
    const { dataSource } = tenantContext;
    const branchRepo = dataSource.getRepository(BranchEntity);

    return await branchRepo.find({
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  /**
   * Get a single branch by ID
   */
  async getBranchById(
    tenantContext: ITenantContext,
    branchId: string,
  ): Promise<BranchEntity> {
    const { dataSource } = tenantContext;
    const branchRepo = dataSource.getRepository(BranchEntity);

    const branch = await branchRepo.findOne({ where: { id: branchId } });

    if (!branch) {
      throw new NotFoundException(`Branch with id ${branchId} not found`);
    }

    return branch;
  }

  /**
   * Create a new branch
   */
  async createBranch(
    tenantContext: ITenantContext,
    dto: CreateBranchDto,
  ): Promise<BranchEntity> {
    const { dataSource } = tenantContext;
    const branchRepo = dataSource.getRepository(BranchEntity);

    // Check if slug already exists
    const existing = await branchRepo.findOne({ where: { slug: dto.slug } });
    if (existing) {
      throw new ConflictException(`Branch with slug ${dto.slug} already exists`);
    }

    const branch = branchRepo.create({
      ...dto,
      timezone: dto.timezone || 'America/New_York',
      isActive: dto.isActive ?? true,
      sortOrder: dto.sortOrder ?? 0,
    });

    const saved = await branchRepo.save(branch);
    this.logger.log(`Branch created: ${saved.name} (${saved.slug})`);

    return saved;
  }

  /**
   * Update a branch
   */
  async updateBranch(
    tenantContext: ITenantContext,
    dto: UpdateBranchDto,
  ): Promise<BranchEntity> {
    const { dataSource } = tenantContext;
    const branchRepo = dataSource.getRepository(BranchEntity);

    const branch = await branchRepo.findOne({ where: { id: dto.id } });
    if (!branch) {
      throw new NotFoundException(`Branch with id ${dto.id} not found`);
    }

    // Check if slug is being changed and if it conflicts
    if (dto.slug && dto.slug !== branch.slug) {
      const existing = await branchRepo.findOne({ where: { slug: dto.slug } });
      if (existing) {
        throw new ConflictException(`Branch with slug ${dto.slug} already exists`);
      }
    }

    // Update fields
    Object.assign(branch, {
      slug: dto.slug ?? branch.slug,
      name: dto.name ?? branch.name,
      description: dto.description ?? branch.description,
      address: dto.address ?? branch.address,
      city: dto.city ?? branch.city,
      state: dto.state ?? branch.state,
      zipCode: dto.zipCode ?? branch.zipCode,
      country: dto.country ?? branch.country,
      phone: dto.phone ?? branch.phone,
      email: dto.email ?? branch.email,
      website: dto.website ?? branch.website,
      timezone: dto.timezone ?? branch.timezone,
      isActive: dto.isActive ?? branch.isActive,
      sortOrder: dto.sortOrder ?? branch.sortOrder,
    });

    const updated = await branchRepo.save(branch);
    this.logger.log(`Branch updated: ${updated.name} (${updated.slug})`);

    return updated;
  }

  /**
   * Delete a branch
   */
  async deleteBranch(
    tenantContext: ITenantContext,
    branchId: string,
  ): Promise<void> {
    const { dataSource } = tenantContext;
    const branchRepo = dataSource.getRepository(BranchEntity);

    const branch = await branchRepo.findOne({ where: { id: branchId } });
    if (!branch) {
      throw new NotFoundException(`Branch with id ${branchId} not found`);
    }

    await branchRepo.remove(branch);
    this.logger.log(`Branch deleted: ${branch.name} (${branch.slug})`);
  }
}

