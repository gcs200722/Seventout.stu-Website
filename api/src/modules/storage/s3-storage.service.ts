import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StoragePort } from './storage.port';

@Injectable()
export class S3StorageService implements StoragePort {
  private readonly s3Client: S3Client;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    this.bucket = this.configService.getOrThrow<string>('AWS_S3_BUCKET');
    this.s3Client = new S3Client({
      region: this.configService.getOrThrow<string>('AWS_REGION'),
      credentials: this.configService.get<string>('AWS_ACCESS_KEY_ID')
        ? {
            accessKeyId:
              this.configService.getOrThrow<string>('AWS_ACCESS_KEY_ID'),
            secretAccessKey: this.configService.getOrThrow<string>(
              'AWS_SECRET_ACCESS_KEY',
            ),
          }
        : undefined,
    });
  }

  async putObject(
    key: string,
    body: Buffer | Uint8Array | string,
    options?: {
      contentType?: string;
    },
  ): Promise<void> {
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ...(options?.contentType ? { ContentType: options.contentType } : {}),
      }),
    );
  }

  async getSignedDownloadUrl(
    key: string,
    expiresInSeconds = 900,
  ): Promise<string> {
    return getSignedUrl(
      this.s3Client,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
      { expiresIn: expiresInSeconds },
    );
  }

  async getSignedPutUrl(
    key: string,
    contentType: string,
    expiresInSeconds = 900,
  ): Promise<string> {
    return getSignedUrl(
      this.s3Client,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: contentType,
      }),
      { expiresIn: expiresInSeconds },
    );
  }
}
