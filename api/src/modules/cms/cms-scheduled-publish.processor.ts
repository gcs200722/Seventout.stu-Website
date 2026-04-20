import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { DEFAULT_QUEUE_NAME } from '../queue/queue.constants';
import { CMS_JOB_SCHEDULED_PUBLISH } from './cms.constants';
import { CmsApplicationService } from './cms.application.service';

@Injectable()
@Processor(DEFAULT_QUEUE_NAME)
export class CmsScheduledPublishProcessor extends WorkerHost {
  private readonly logger = new Logger(CmsScheduledPublishProcessor.name);

  constructor(private readonly cmsApplication: CmsApplicationService) {
    super();
  }

  async process(job: Job<Record<string, unknown>>): Promise<void> {
    if (job.name !== CMS_JOB_SCHEDULED_PUBLISH) {
      return;
    }
    const pageId = job.data.page_id;
    if (typeof pageId !== 'string' || pageId.length === 0) {
      this.logger.warn('cms.scheduled_publish missing page_id');
      return;
    }
    try {
      await this.cmsApplication.publishPageInvalidateCache(pageId);
    } catch (err) {
      this.logger.error(
        `cms.scheduled_publish failed for ${pageId}: ${String(err)}`,
      );
      throw err;
    }
  }
}
