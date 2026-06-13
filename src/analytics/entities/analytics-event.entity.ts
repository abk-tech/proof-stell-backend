import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { AnalyticsEvent } from '../analytics-event.enum';

@Entity('analytics_events')
@Index(['event', 'timestamp'])
@Index(['userId', 'timestamp'])
export class AnalyticsEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: AnalyticsEvent,
  })
  @Index()
  event: AnalyticsEvent;

  @CreateDateColumn()
  @Index()
  timestamp: Date;

  @Column({ nullable: true })
  @Index()
  userId?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ nullable: true })
  sessionId?: string;

  @Column({ nullable: true })
  ipAddress?: string;

  @Column({ nullable: true })
  userAgent?: string;

  @Column({ nullable: true })
  referrer?: string;
}
