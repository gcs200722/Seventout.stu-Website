import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationEntity } from './entities/notification.entity';
import { NotificationDeliveryAttemptEntity } from './entities/notification-delivery-attempt.entity';
import { OrderEntity } from '../orders/entities/order.entity';
import { UserEntity } from '../users/user.entity';
import { NotificationService } from './notification.service';
import { QUEUE_PORT } from '../queue/queue.constants';
import { QueuePort } from '../queue/queue.port';
import { UserRole } from '../authorization/authorization.types';
import { NotificationEmailService } from './notification-email.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let notificationsRepository: jest.Mocked<Repository<NotificationEntity>>;
  let attemptsRepository: jest.Mocked<
    Repository<NotificationDeliveryAttemptEntity>
  >;
  let queuePort: jest.Mocked<QueuePort>;

  beforeEach(async () => {
    notificationsRepository = {
      createQueryBuilder: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<Repository<NotificationEntity>>;
    attemptsRepository = {
      create: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<NotificationDeliveryAttemptEntity>>;
    const ordersRepository = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<OrderEntity>>;
    const usersRepository = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<UserEntity>>;
    queuePort = {
      enqueue: jest.fn(),
    };
    const notificationEmailService = {
      sendEmail: jest.fn(),
    } as unknown as NotificationEmailService;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: getRepositoryToken(NotificationEntity),
          useValue: notificationsRepository,
        },
        {
          provide: getRepositoryToken(NotificationDeliveryAttemptEntity),
          useValue: attemptsRepository,
        },
        {
          provide: getRepositoryToken(OrderEntity),
          useValue: ordersRepository,
        },
        {
          provide: getRepositoryToken(UserEntity),
          useValue: usersRepository,
        },
        {
          provide: NotificationEmailService,
          useValue: notificationEmailService,
        },
        { provide: QUEUE_PORT, useValue: queuePort },
      ],
    }).compile();

    service = module.get(NotificationService);
  });

  it('should_mark_all_notifications_as_read_for_user', async () => {
    const execute = jest.fn().mockResolvedValue({ affected: 3 });
    const andWhere = jest.fn().mockReturnValue({ execute });
    const where = jest.fn().mockReturnValue({ andWhere });
    const set = jest.fn().mockReturnValue({ where });
    const update = jest.fn().mockReturnValue({ set });
    const createQueryBuilderMock = jest.fn();
    createQueryBuilderMock.mockReturnValue({ update });
    Object.assign(notificationsRepository, {
      createQueryBuilder: createQueryBuilderMock,
    });

    const updated = await service.markAllAsRead({
      id: 'user-id',
      email: 'user@example.com',
      role: UserRole.USER,
      permissions: [],
    });

    expect(updated).toBe(3);
    expect(createQueryBuilderMock).toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith(NotificationEntity);
  });

  it('should_mark_all_notifications_as_read_for_admin_scope', async () => {
    const execute = jest.fn().mockResolvedValue({ affected: 2 });
    const andWhere = jest.fn().mockReturnValue({ execute });
    const where = jest.fn().mockReturnValue({ andWhere });
    const set = jest.fn().mockReturnValue({ where });
    const update = jest.fn().mockReturnValue({ set });
    const createQueryBuilderMock = jest.fn();
    createQueryBuilderMock.mockReturnValue({ update });
    Object.assign(notificationsRepository, {
      createQueryBuilder: createQueryBuilderMock,
    });

    const updated = await service.markAllAsRead({
      id: 'admin-id',
      email: 'admin@example.com',
      role: UserRole.ADMIN,
      permissions: [],
    });

    expect(updated).toBe(2);
    expect(createQueryBuilderMock).toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith(NotificationEntity);
  });

  it('should_store_delivery_attempt_after_processing_email_job', async () => {
    notificationsRepository.findOne.mockResolvedValue({
      id: 'notification-id',
    } as NotificationEntity);
    attemptsRepository.create.mockReturnValue({
      notificationId: 'notification-id',
      status: 'SUCCESS',
      errorMessage: null,
      metadata: {},
    } as NotificationDeliveryAttemptEntity);

    await service.processEmailJob({
      notification_id: 'notification-id',
      to: 'user@example.com',
      subject: 'hello',
      content: 'world',
    });

    expect(attemptsRepository.save.mock.calls.length).toBe(1);
  });
});
