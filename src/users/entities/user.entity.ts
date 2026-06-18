/* eslint-disable prettier/prettier */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
  BeforeUpdate,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import * as bcrypt from 'bcrypt';
import { Role } from '../../common/enums/role.enum';
import { GameSession } from 'src/game-session/entities/game-session.entity';
import { Leaderboard } from '../../leaderboard/entities/leaderboard.entity';
import { UserBadge } from '../../badge/entities/user-badge.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  @Exclude()
  password: string;

  @Column()
  username: string;

  @Column({
    type: 'enum',
    enum: Role,
    default: Role.PLAYER,
  })
  role: Role;

  @Column({ nullable: true })
  walletAddress?: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isEmailVerified: boolean;

  @Column({ nullable: true })
  emailVerificationToken?: string;

  @Column({ nullable: true, type: 'timestamp' })
  emailVerificationExpires?: Date;

  @Column({ nullable: true })
  lastLogin?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true, length: 50 })
  displayName?: string;

  @Column({ nullable: true })
  avatarUrl?: string;

  @Column({ type: 'simple-json', nullable: true })
  emailPreferences?: {
    promotional: boolean;
    transactional: boolean;
  };

  // Game statistics
  @Column({ default: 0 })
  gamesPlayed: number;

  @Column({ default: 0 })
  totalScore: number;

  @Column({ default: 0 })
  highestScore: number;

  @Column({ default: 0 })
  referrals: number;

  @Column({ default: 0 })
  currentStreak: number;

  @Column({ default: 0 })
  longestStreak: number;

  // Relations
  @OneToMany(() => GameSession, (game) => game.user)
  gameSessions: GameSession[];

  @OneToMany(() => UserBadge, (userBadge) => userBadge.user)
  userBadges: UserBadge[];

  @OneToOne(() => Leaderboard, (leaderboard) => leaderboard.user)
  leaderboard: Leaderboard;

  // FIX: Removed DI class initialization hooks from entity definitions.
  // Entities should remain pure schema blueprints.
  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.password && !this.password.startsWith('$2b$')) {
      // Use the safe industry default salt size of 12 for background database executions
      const saltRounds = 12;
      this.password = await bcrypt.hash(this.password, saltRounds);
    }
  }

  async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }
}