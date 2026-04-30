import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import Redis from 'ioredis';
import { QueueModule } from '../../core/queue/queue.module';
import { StorageModule } from '../../core/storage/storage.module';
import { CmsApplicationService } from './cms.application.service';
import { CmsAssetsController } from './cms-assets.controller';
import { CmsAssetsService } from './cms-assets.service';
import { CmsPagesController } from './cms-pages.controller';
import { CmsRepository } from './cms.repository';
import { CmsScheduledPublishProcessor } from './cms-scheduled-publish.processor';
import { CmsSectionsController } from './cms-sections.controller';
import { CMS_PUBLISHED_CACHE_PORT } from './cms-published-cache.port';
import { RedisCmsPublishedCacheAdapter } from './redis-cms-published-cache.adapter';
import { CmsAssetEntity } from './entities/cms-asset.entity';
import { CmsBlockEntity } from './entities/cms-block.entity';
import { CmsPageEntity } from './entities/cms-page.entity';
import { CmsSectionEntity } from './entities/cms-section.entity';
import { CmsThemeEntity } from './entities/cms-theme.entity';

export const CMS_REDIS_CLIENT = Symbol('CMS_REDIS_CLIENT');

@Module({
  imports: [
    ConfigModule,
    QueueModule,
    StorageModule,
    TypeOrmModule.forFeature([
      CmsPageEntity,
      CmsSectionEntity,
      CmsBlockEntity,
      CmsAssetEntity,
      CmsThemeEntity,
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret:
          configService.get<string>('CMS_PREVIEW_SECRET') ??
          configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [CmsPagesController, CmsSectionsController, CmsAssetsController],
  providers: [
    CmsRepository,
    CmsApplicationService,
    CmsAssetsService,
    CmsScheduledPublishProcessor,
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
