import { Global, Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuditLog } from '../audit/audit-log.entity'
import { AuditLogger } from './audit-logger.service'

/** Global so any service can inject AuditLogger to record financial/admin actions. */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  providers: [AuditLogger],
  exports: [AuditLogger],
})
export class AuditLoggerModule {}
