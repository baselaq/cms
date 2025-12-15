import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import type { ITenantMetadata } from '@/tenant/tenant.context';

@Entity('clubs')
@Index(['subdomain'])
@Index(['status'])
export class ClubEntity implements ITenantMetadata {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  subdomain: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, name: 'db_host' })
  dbHost: string;

  @Column({ type: 'integer', name: 'db_port', default: 5432 })
  dbPort: number;

  @Column({ type: 'varchar', length: 255, name: 'db_name' })
  dbName: string;

  @Column({ type: 'varchar', length: 255, name: 'db_user' })
  dbUser: string;

  @Column({ type: 'text', name: 'db_password_encrypted' })
  dbPasswordEncrypted: string;

  @Column({
    type: 'integer',
    name: 'connection_pool_size',
    default: 10,
    nullable: true,
  })
  connectionPoolSize?: number;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'active',
    enum: ['active', 'suspended', 'inactive'],
  })
  status: 'active' | 'suspended' | 'inactive';

  @Column({
    type: 'varchar',
    length: 128,
    name: 'onboarding_token_hash',
    nullable: true,
  })
  onboardingTokenHash?: string | null;

  @Column({
    type: 'timestamp',
    name: 'onboarding_token_expires_at',
    nullable: true,
  })
  onboardingTokenExpiresAt?: Date | null;

  @Column({
    type: 'varchar',
    length: 20,
    name: 'onboarding_status',
    default: 'pending',
  })
  onboardingStatus: 'pending' | 'completed';

  @Column({
    type: 'timestamp',
    name: 'onboarding_completed_at',
    nullable: true,
  })
  onboardingCompletedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
