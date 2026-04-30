import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '../authorization/authorization.module';
import { OrderEntity } from '../../extensions/orders/entities/order.entity';
import { QueueModule } from '../queue/queue.module';
import { UserEntity } from '../users/user.entity';
import { NotificationController } from './notification.controller';
import { NotificationEmailService } from './notification-email.service';
import { NotificationProcessor } from './notification.processor';
import { NotificationService } from './notification.service';
import { NotificationDeliveryAttemptEntity } from './entities/notification-delivery-attempt.entity';
import { NotificationEntity } from './entities/notification.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      NotificationEntity,
      NotificationDeliveryAttemptEntity,
      OrderEntity,
      UserEntity,
    ]),
    AuthorizationModule,
    QueueModule,
  ],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationEmailService,
    NotificationProcessor,
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
