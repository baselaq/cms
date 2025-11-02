import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClubEntity } from '../database/master/entities/club.entity';
import { ITenantMetadata, ITenantDbConfig } from './tenant.context';
import { decrypt } from '../utils/encryption.util';

@Injectable()
export class TenantMetadataService {
  private readonly logger = new Logger(TenantMetadataService.name);

  constructor(
    @InjectRepository(ClubEntity)
    private readonly clubRepository: Repository<ClubEntity>,
  ) {}

  /**
   * Find tenant metadata by subdomain
   */
  async findBySubdomain(subdomain: string): Promise<ITenantMetadata | null> {
    try {
      const club = await this.clubRepository.findOne({
        where: { subdomain, status: 'active' },
      });

      if (!club) {
        this.logger.warn(`Club not found for subdomain: ${subdomain}`);
        return null;
      }

      return this.mapEntityToMetadata(club);
    } catch (error) {
      this.logger.error(
        `Error finding tenant by subdomain ${subdomain}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Find tenant metadata by ID
   */
  async findById(tenantId: string): Promise<ITenantMetadata | null> {
    try {
      const club = await this.clubRepository.findOne({
        where: { id: tenantId, status: 'active' },
      });

      if (!club) {
        this.logger.warn(`Club not found for ID: ${tenantId}`);
        return null;
      }

      return this.mapEntityToMetadata(club);
    } catch (error) {
      this.logger.error(`Error finding tenant by ID ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Get decrypted database configuration from metadata
   */
  getDbConfig(metadata: ITenantMetadata): ITenantDbConfig {
    try {
      let decryptedPassword = '';

      // Handle empty password (some databases don't require passwords)
      if (
        metadata.dbPasswordEncrypted &&
        metadata.dbPasswordEncrypted.trim().length > 0
      ) {
        decryptedPassword = decrypt(metadata.dbPasswordEncrypted);
      }

      return {
        host: metadata.dbHost,
        port: metadata.dbPort,
        database: metadata.dbName,
        username: metadata.dbUser,
        password: decryptedPassword,
        poolSize: metadata.connectionPoolSize || 10,
      };
    } catch (error) {
      this.logger.error(
        `Error decrypting database config for tenant ${metadata.id}:`,
        error,
      );
      throw new Error('Failed to decrypt database credentials');
    }
  }

  /**
   * Map entity to metadata interface
   */
  private mapEntityToMetadata(entity: ClubEntity): ITenantMetadata {
    return {
      id: entity.id,
      subdomain: entity.subdomain,
      name: entity.name,
      dbHost: entity.dbHost,
      dbPort: entity.dbPort,
      dbName: entity.dbName,
      dbUser: entity.dbUser,
      dbPasswordEncrypted: entity.dbPasswordEncrypted,
      connectionPoolSize: entity.connectionPoolSize,
      status: entity.status,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
