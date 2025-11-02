import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';

@Entity('user_tokens')
@Index(['userId'])
@Index(['token'])
@Index(['expiresAt'])
export class UserTokenEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ type: 'text', unique: true })
  token: string; // Hashed refresh token

  @Column({ type: 'timestamp', name: 'expires_at' })
  expiresAt: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  device: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'ip_address' })
  ipAddress: string | null;

  @Column({ type: 'timestamp', nullable: true, name: 'revoked_at' })
  revokedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
