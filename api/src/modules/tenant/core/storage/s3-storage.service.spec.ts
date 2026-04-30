const sendMock = jest.fn();
const getSignedUrlMock = jest.fn();

jest.mock('@aws-sdk/client-s3', () => {
  return {
    GetObjectCommand: jest
      .fn()
      .mockImplementation((input: Record<string, unknown>) => ({ input })),
    PutObjectCommand: jest
      .fn()
      .mockImplementation((input: Record<string, unknown>) => ({ input })),
    S3Client: jest.fn().mockImplementation(() => ({
      send: sendMock,
    })),
  };
});
jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: getSignedUrlMock,
}));

import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { S3StorageService } from './s3-storage.service';

describe('S3StorageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sendMock.mockResolvedValue({});
    getSignedUrlMock.mockResolvedValue('https://signed.example.com/object');
  });

  it('builds client without credentials when access key is missing', async () => {
    const configService = {
      getOrThrow: jest.fn((key: string) => {
        const values: Record<string, string> = {
          AWS_S3_BUCKET: 'bucket-a',
          AWS_REGION: 'ap-southeast-1',
        };
        return values[key];
      }),
      get: jest.fn(() => undefined),
    };

    const service = new S3StorageService(configService as never);
    await service.putObject('test.txt', 'hello', { contentType: 'text/plain' });

    expect(S3Client).toHaveBeenCalledWith({
      region: 'ap-southeast-1',
      credentials: undefined,
    });
    expect(PutObjectCommand).toHaveBeenCalledWith({
      Bucket: 'bucket-a',
      Key: 'test.txt',
      Body: 'hello',
      ContentType: 'text/plain',
    });
    expect(sendMock).toHaveBeenCalledTimes(1);
    await expect(
      service.getSignedDownloadUrl('products/a b.jpg', 300),
    ).resolves.toBe('https://signed.example.com/object');
    expect(GetObjectCommand).toHaveBeenCalledWith({
      Bucket: 'bucket-a',
      Key: 'products/a b.jpg',
    });
    expect(getSignedUrlMock).toHaveBeenCalled();
  });

  it('builds client with credentials when access key exists', async () => {
    const configService = {
      getOrThrow: jest.fn((key: string) => {
        const values: Record<string, string> = {
          AWS_S3_BUCKET: 'bucket-b',
          AWS_REGION: 'ap-southeast-1',
          AWS_ACCESS_KEY_ID: 'key-id',
          AWS_SECRET_ACCESS_KEY: 'secret-key',
        };
        return values[key];
      }),
      get: jest.fn((key: string) =>
        key === 'AWS_ACCESS_KEY_ID' ? 'key-id' : undefined,
      ),
    };

    const service = new S3StorageService(configService as never);
    await service.putObject('avatar.png', Buffer.from('123'));

    expect(S3Client).toHaveBeenCalledWith({
      region: 'ap-southeast-1',
      credentials: {
        accessKeyId: 'key-id',
        secretAccessKey: 'secret-key',
      },
    });
    expect(sendMock).toHaveBeenCalledTimes(1);
  });
});
