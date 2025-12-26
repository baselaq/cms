import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('branches')
@Index(['slug'])
export class BranchEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    length: 150,
    unique: true,
  })
  slug: string;

  @Column({
    type: 'varchar',
    length: 255,
  })
  name: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  description: string | null;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  address: string | null;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  city: string | null;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  state: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
    name: 'zip_code',
  })
  zipCode: string | null;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  country: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  phone: string | null;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  email: string | null;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  website: string | null;

  @Column({
    type: 'varchar',
    length: 100,
    default: 'America/New_York',
  })
  timezone: string;

  @Column({
    type: 'boolean',
    default: true,
    name: 'is_active',
  })
  isActive: boolean;

  @Column({
    type: 'integer',
    default: 0,
    name: 'sort_order',
  })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

