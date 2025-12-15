import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('teams')
@Index(['slug'], { unique: true })
export class TeamEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'varchar', length: 150 })
  slug: string;

  @Column({ type: 'varchar', length: 50, default: 'soccer' })
  sport: string;

  @Column({ type: 'varchar', length: 50, name: 'age_group', default: 'U12' })
  ageGroup: string;

  @Column({ type: 'varchar', length: 20, default: 'coed' })
  gender: string;

  @Column({ type: 'varchar', length: 100, default: 'fall' })
  season: string;

  @Column({
    type: 'varchar',
    length: 255,
    name: 'home_venue',
    nullable: true,
  })
  homeVenue: string | null;

  @Column({
    type: 'varchar',
    length: 7,
    name: 'primary_color',
    default: '#0ea5e9',
  })
  primaryColor: string;

  @Column({
    type: 'varchar',
    length: 7,
    name: 'secondary_color',
    default: '#111827',
  })
  secondaryColor: string;

  @Column({
    type: 'varchar',
    length: 150,
    default: 'America/New_York',
  })
  timezone: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  description: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
