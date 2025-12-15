import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('club_invites')
@Index(['email'], { unique: true })
export class ClubInviteEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 50, default: 'staff' })
  role: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'pending',
    enum: ['pending', 'accepted', 'expired', 'revoked'],
  })
  status: 'pending' | 'accepted' | 'expired' | 'revoked';

  @Column({
    type: 'varchar',
    length: 128,
    name: 'invite_token',
    nullable: true,
  })
  inviteToken: string | null;

  @Column({ type: 'varchar', length: 255, name: 'invited_by', nullable: true })
  invitedBy: string | null;

  @Column({ type: 'timestamp', name: 'accepted_at', nullable: true })
  acceptedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
