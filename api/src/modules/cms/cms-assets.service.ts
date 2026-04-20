import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { STORAGE_PORT } from '../storage/storage.constants';
import type { StoragePort } from '../storage/storage.port';
import { CmsAssetEntity } from './entities/cms-asset.entity';

@Injectable()
export class CmsAssetsService {
  private readonly presignExpires: number;

  constructor(
    @InjectRepository(CmsAssetEntity)
    private readonly assets: Repository<CmsAssetEntity>,
    @Inject(STORAGE_PORT)
    private readonly storage: StoragePort,
    private readonly configService: ConfigService,
  ) {
    this.presignExpires = this.configService.get<number>(
      'AWS_S3_PRESIGNED_EXPIRES_SECONDS',
      900,
    );
  }

  private buildPublicUrl(objectKey: string): string {
    const base = this.configService.get<string>('AWS_S3_PUBLIC_BASE_URL');
    if (base && base.trim().length > 0) {
      const trimmed = base.replace(/\/+$/, '');
      return `${trimmed}/${objectKey}`;
    }
    const bucket = this.configService.getOrThrow<string>('AWS_S3_BUCKET');
    const region = this.configService.getOrThrow<string>('AWS_REGION');
    return `https://${bucket}.s3.${region}.amazonaws.com/${objectKey}`;
  }

  async listRecent(limit = 48): Promise<CmsAssetEntity[]> {
    const take = Math.min(Math.max(limit, 1), 100);
    return this.assets.find({
      order: { createdAt: 'DESC' },
      take,
    });
  }

  async presignUpload(
    contentType: string,
    filename?: string,
  ): Promise<{
    object_key: string;
    upload_url: string;
    public_url: string;
    expires_in_seconds: number;
  }> {
    const safe =
      filename && filename.trim().length > 0
        ? filename.trim().slice(0, 120)
        : 'upload.bin';
    const objectKey = `cms/assets/${randomUUID()}-${safe.replace(/\s+/g, '_')}`;
    const uploadUrl = await this.storage.getSignedPutUrl(
      objectKey,
      contentType,
      this.presignExpires,
    );
    return {
      object_key: objectKey,
      upload_url: uploadUrl,
      public_url: this.buildPublicUrl(objectKey),
      expires_in_seconds: this.presignExpires,
    };
  }

  async registerAsset(payload: {
    objectKey: string;
    publicUrl: string;
    mime: string;
    alt?: string;
    width?: number;
    height?: number;
  }): Promise<CmsAssetEntity> {
    const expectedPublic = this.buildPublicUrl(payload.objectKey);
    if (payload.publicUrl !== expectedPublic) {
      throw new BadRequestException({
        message:
          'public_url must match configured S3 public URL for object_key',
        details: { code: 'CMS_ASSET_PUBLIC_URL_MISMATCH' },
      });
    }
    const entity = this.assets.create({
      objectKey: payload.objectKey,
      publicUrl: payload.publicUrl,
      mime: payload.mime,
      alt: payload.alt ?? '',
      width: payload.width ?? null,
      height: payload.height ?? null,
      focalX: null,
      focalY: null,
    });
    return this.assets.save(entity);
  }
}
