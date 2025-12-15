import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('club_settings')
export class ClubSettingEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    length: 50,
    name: 'theme_mode',
    default: 'system',
  })
  themeMode: 'light' | 'dark' | 'system';

  @Column({
    type: 'varchar',
    length: 7,
    name: 'primary_color',
    default: '#111827',
  })
  primaryColor: string;

  @Column({
    type: 'varchar',
    length: 7,
    name: 'secondary_color',
    default: '#0ea5e9',
  })
  secondaryColor: string;

  @Column({
    type: 'varchar',
    length: 7,
    name: 'accent_color',
    default: '#f97316',
  })
  accentColor: string;

  @Column({
    type: 'varchar',
    length: 100,
    default: 'America/New_York',
  })
  timezone: string;

  @Column({
    type: 'varchar',
    length: 10,
    default: 'en-US',
  })
  locale: string;

  @Column({
    type: 'boolean',
    name: 'onboarding_complete',
    default: false,
  })
  onboardingComplete: boolean;

  @Column({
    type: 'varchar',
    length: 50,
    name: 'onboarding_step',
    default: 'club-info',
  })
  onboardingStep: string;

  @Column({
    type: 'timestamp',
    name: 'onboarding_completed_at',
    nullable: true,
  })
  onboardingCompletedAt: Date | null;

  @Column({
    type: 'varchar',
    length: 255,
    name: 'branding_logo_url',
    nullable: true,
  })
  brandingLogoUrl: string | null;

  @Column({
    type: 'varchar',
    length: 255,
    name: 'support_email',
    nullable: true,
  })
  supportEmail: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
