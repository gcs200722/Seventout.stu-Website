import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import Redis from 'ioredis';
import { CmsApplicationService } from './cms.application.service';
import { CmsPagesController } from './cms-pages.controller';
import { CmsRepository } from './cms.repository';
import { CmsSectionsController } from './cms-sections.controller';
import { CMS_PUBLISHED_CACHE_PORT } from './cms-published-cache.port';
import { RedisCmsPublishedCacheAdapter } from './redis-cms-published-cache.adapter';
import { CmsBlockEntity } from './entities/cms-block.entity';
import { CmsPageEntity } from './entities/cms-page.entity';
import { CmsSectionEntity } from './entities/cms-section.entity';

export const CMS_REDIS_CLIENT = Symbol('CMS_REDIS_CLIENT');

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([CmsPageEntity, CmsSectionEntity, CmsBlockEntity]),
  ],
  controllers: [CmsPagesController, CmsSectionsController],
  providers: [
    CmsRepository,
    CmsApplicationService,
    {
      provide: CMS_REDIS_CLIENT,
      useFactory: (configService: ConfigService) => {
        return new Redis({
          host: configService.getOrThrow<string>('REDIS_HOST'),
          port: configService.getOrThrow<number>('REDIS_PORT'),
          password: configService.get<string>('REDIS_PASSWORD') || undefined,
          maxRetriesPerRequest: 2,
        });
      },
      inject: [ConfigService],
    },
    {
      provide: CMS_PUBLISHED_CACHE_PORT,
      useFactory: (redis: Redis) => new RedisCmsPublishedCacheAdapter(redis),
      inject: [CMS_REDIS_CLIENT],
    },
  ],
  exports: [CmsApplicationService],
})
export class CmsModule {}
