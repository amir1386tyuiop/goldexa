import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AuditLog } from '../audit/audit-log.entity'

export interface AuditEntry {
  userId?: string | null
  action: string
  entityType?: string | null
  entityId?: string | null
  metadata?: Record<string, unknown>
}

/**
 * Records important (especially financial/admin) actions to the audit_logs
 * table and emits a structured log line. Writing the audit row never throws
 * into the caller's transaction — auditing must not break the business op.
 */
@Injectable()
export class AuditLogger {
  private readonly logger = new Logger('Audit')

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepository: Repository<AuditLog>,
  ) {}

  async record(entry: AuditEntry): Promise<void> {
    this.logger.log(
      JSON.stringify({ action: entry.action, userId: entry.userId ?? null, entityId: entry.entityId ?? null, ...entry.metadata }),
    )
    try {
      await this.auditRepository.save(
        this.auditRepository.create({
          userId: entry.userId ?? null,
          action: entry.action,
          entity_type: entry.entityType ?? null,
          entity_id: entry.entityId ?? null,
          metadata: entry.metadata ?? {},
        }),
      )
    } catch (error) {
      this.logger.warn(`Failed to persist audit log for ${entry.action}: ${(error as Error).message}`)
    }
  }
}
