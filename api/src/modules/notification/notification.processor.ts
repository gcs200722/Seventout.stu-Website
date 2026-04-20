import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { DEFAULT_QUEUE_NAME } from '../queue/queue.constants';
import { NotificationService } from './notification.service';

type SendEmailJobData = {
  notification_id: string;
  to: string;
  subject: string;
  content: string;
};

@Processor(DEFAULT_QUEUE_NAME)
export class NotificationProcessor extends WorkerHost {
  constructor(private readonly notificationService: NotificationService) {
    super();
  }

  async process(job: Job<SendEmailJobData>): Promise<void> {
    if (job.name !== 'send_email') {
      return;
    }
    await this.notificationService.processEmailJob(job.data);
  }
}
