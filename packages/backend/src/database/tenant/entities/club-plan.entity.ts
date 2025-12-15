import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('club_plans')
@Index(['planCode'], { unique: true })
export class ClubPlanEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, name: 'plan_code' })
  planCode: string;

  @Column({ type: 'varchar', length: 100, name: 'plan_name' })
  planName: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'trialing',
    enum: ['trialing', 'active', 'canceled'],
  })
  status: 'trialing' | 'active' | 'canceled';

  @Column({
    type: 'varchar',
    length: 20,
    name: 'billing_cycle',
    default: 'monthly',
    enum: ['monthly', 'annual'],
  })
  billingCycle: 'monthly' | 'annual';

  @Column({
    type: 'integer',
    name: 'member_limit',
    default: 25,
  })
  memberLimit: number;

  @Column({
    type: 'integer',
    name: 'coach_limit',
    default: 5,
  })
  coachLimit: number;

  @Column({
    type: 'numeric',
    name: 'monthly_price',
    precision: 10,
    scale: 2,
    default: 0,
  })
  monthlyPrice: number;

  @Column({
    type: 'timestamp',
    name: 'trial_ends_at',
    nullable: true,
  })
  trialEndsAt: Date | null;

  @Column({
    type: 'timestamp',
    name: 'activated_at',
    nullable: true,
  })
  activatedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
