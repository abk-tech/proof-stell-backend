import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from "typeorm"

@Entity("audit_logs")
@Index(["userId", "actionType"])
@Index(["createdAt"])
export class AuditLog {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ type: "uuid" })
  @Index()
  userId: string

  @Column({ type: "varchar", length: 100 })
  @Index()
  actionType: string

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, any>

  @CreateDateColumn()
  createdAt: Date

  @Column({ type: "varchar", length: 45, nullable: true })
  ipAddress: string

  @Column({ type: "text", nullable: true })
  userAgent: string

  @Column({ type: "varchar", length: 255, nullable: true })
  resource: string

  @Column({ type: "varchar", length: 50, nullable: true })
  result: string // SUCCESS, FAILURE, ERROR

  @Column({ type: "text", nullable: true })
  errorMessage: string
}
