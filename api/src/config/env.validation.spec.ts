import 'reflect-metadata';
import { validateEnv } from './env.validation';

describe('validateEnv', () => {
  it('returns config with defaults when optional values missing', () => {
    const config = validateEnv({
      PORT: '4000',
      DB_HOST: 'localhost',
      DB_PORT: 5433,
      DB_USER: 'postgres',
      DB_PASSWORD: 'postgres',
      DB_NAME: 'seventout',
      REDIS_HOST: 'localhost',
      REDIS_PORT: 6379,
      AWS_REGION: 'ap-southeast-1',
      AWS_S3_BUCKET: 'bucket-name',
      BULLMQ_DEFAULT_QUEUE: 'default',
      DEFAULT_ADMIN_EMAIL: 'admin@example.com',
      DEFAULT_ADMIN_PASSWORD: 'strong-password',
    });

    expect(config.NODE_ENV).toBe('development');
    expect(config.PORT).toBe(4000);
    expect(config.DB_PORT).toBe(5433);
    expect(config.REDIS_PORT).toBe(6379);
    expect(config.AWS_S3_PRESIGNED_EXPIRES_SECONDS).toBe(900);
  });

  it('throws when a required field is invalid', () => {
    expect(() =>
      validateEnv({
        DB_HOST: 'localhost',
        DB_PORT: 0,
        DB_USER: 'postgres',
        DB_PASSWORD: 'postgres',
        DB_NAME: 'seventout',
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6379,
        AWS_REGION: 'ap-southeast-1',
        AWS_S3_BUCKET: 'bucket-name',
        BULLMQ_DEFAULT_QUEUE: 'default',
      }),
    ).toThrow(Error);
  });
});
