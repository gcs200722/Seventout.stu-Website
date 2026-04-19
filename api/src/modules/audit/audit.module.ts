import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '../authorization/authorization.module';
import { AUDIT_QUEUE_NAME } from './audit.constants';
import { AuditAdminController } from './audit-admin.controller';
import { AuditLogProcessor } from './audit-log.processor';
import { AuditLogService } from './audit-log.service';
import { AuditPublisher } from './audit.publisher';
import { AUDIT_PUBLISHER_PORT } from './audit.publisher.port';
import { AuditHttpContextMiddleware } from './audit-http-context.middleware';
import { AuditWriterService } from './audit-writer.service';
import { AuditLogEntity } from './entities/audit-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AuditLogEntity]),
    BullModule.registerQueue({ name: AUDIT_QUEUE_NAME }),
    AuthorizationModule,
  ],
  controllers: [AuditAdminController],
  providers: [
    AuditLogService,
    AuditLogProcessor,
    AuditPublisher,
    AuditWriterService,
    AuditHttpContextMiddleware,
    {
      provide: AUDIT_PUBLISHER_PORT,
      useExisting: AuditPublisher,
    },
  ],
  exports: [
    AUDIT_PUBLISHER_PORT,
    AuditWriterService,
    AuditHttpContextMiddleware,
  ],
})
export class AuditModule {}
