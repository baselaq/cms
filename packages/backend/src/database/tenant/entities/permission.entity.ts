import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('permissions')
@Index(['name'])
@Index(['module'])
export class PermissionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  name: string; // e.g., 'team.read', 'team.write', 'calendar.read'

  @Column({ type: 'varchar', length: 50 })
  module: string; // e.g., 'team', 'calendar', 'communication'

  @Column({ type: 'varchar', length: 50 })
  action: string; // e.g., 'read', 'write', 'delete'

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
