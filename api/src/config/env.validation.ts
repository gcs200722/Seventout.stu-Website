import { plainToInstance, Transform } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  validateSync,
} from 'class-validator';

class EnvironmentVariables {
  @IsEnum(['development', 'test', 'production'])
  @IsOptional()
  NODE_ENV: 'development' | 'test' | 'production' = 'development';

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @IsOptional()
  PORT = 3001;

  @IsString()
  DB_HOST = 'localhost';

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  DB_PORT = 5433;

  @IsString()
  DB_USER = 'postgres';

  @IsString()
  DB_PASSWORD = 'postgres';

  @IsString()
  DB_NAME = 'seventout';

  @IsString()
  REDIS_HOST = 'localhost';

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  REDIS_PORT = 6379;

  @IsString()
  @IsOptional()
  REDIS_PASSWORD?: string;

  @IsString()
  AWS_REGION = 'ap-southeast-1';

  @IsString()
  AWS_S3_BUCKET = 'seventout-dev-bucket';

  /** Optional public origin for object keys (e.g. CloudFront). If unset, virtual-hosted S3 URL is used. */
  @IsString()
  @IsOptional()
  AWS_S3_PUBLIC_BASE_URL?: string;

  @IsString()
  @IsOptional()
  AWS_ACCESS_KEY_ID?: string;

  @IsString()
  @IsOptional()
  AWS_SECRET_ACCESS_KEY?: string;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(60)
  @IsOptional()
  AWS_S3_PRESIGNED_EXPIRES_SECONDS = 900;

  @IsString()
  BULLMQ_DEFAULT_QUEUE = 'default';

  @IsString()
  JWT_ACCESS_SECRET = 'access-secret';

  @IsString()
  JWT_REFRESH_SECRET = 'refresh-secret';

  @IsString()
  @IsOptional()
  JWT_ACCESS_EXPIRES_IN = '10m';

  @IsString()
  @IsOptional()
  JWT_REFRESH_EXPIRES_IN = '7d';

  @IsString()
  @IsOptional()
  GOOGLE_CLIENT_ID = '';

  @IsString()
  @IsOptional()
  GOOGLE_CLIENT_SECRET = '';

  @IsString()
  @IsOptional()
  GOOGLE_CALLBACK_URL = 'http://localhost:3001/auth/google/callback';

  @IsString()
  @IsOptional()
  GOOGLE_SUCCESS_REDIRECT_URL = 'http://localhost:3000/auth/google/callback';

  @IsString()
  @IsOptional()
  GOOGLE_FAILURE_REDIRECT_URL = 'http://localhost:3000/auth/google/callback';

  @IsString()
  @IsOptional()
  GOOGLE_STATE_SECRET?: string;

  /** Set to 1 or true behind reverse proxy so req.ip / X-Forwarded-For work for audit. */
  @IsString()
  @IsOptional()
  TRUST_PROXY?: string;

  /** Comma-separated CORS origins. Example: https://app.example.com,https://admin.example.com */
  @IsString()
  @IsOptional()
  CORS_ALLOWED_ORIGINS = 'http://localhost:3000,http://localhost:3001';

  @IsIn(['true', 'false', '1', '0'])
  @IsOptional()
  SWAGGER_ENABLED = 'true';

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1000)
  @IsOptional()
  THROTTLE_TTL_MS = 60000;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @IsOptional()
  THROTTLE_LIMIT = 100;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1000)
  @IsOptional()
  THROTTLE_AUTH_TTL_MS = 60000;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @IsOptional()
  THROTTLE_AUTH_LIMIT = 10;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(4)
  @IsOptional()
  PASSWORD_SALT_ROUNDS = 10;

  @IsString()
  DEFAULT_ADMIN_EMAIL: string;

  @IsString()
  DEFAULT_ADMIN_PASSWORD: string;

  @IsString()
  @IsOptional()
  DEFAULT_ADMIN_FIRST_NAME = 'System';

  @IsString()
  @IsOptional()
  DEFAULT_ADMIN_LAST_NAME = 'Admin';

  @IsString()
  @IsOptional()
  DEFAULT_ADMIN_PHONE = '0000000000';

  @IsString()
  @IsOptional()
  DEFAULT_TENANT_ID?: string;

  @IsString()
  @IsOptional()
  DEFAULT_TENANT_SLUG = 'default';

  @IsString()
  @IsOptional()
  PLATFORM_ROOT_DOMAIN = 'localtest.me';

  @IsString()
  @IsOptional()
  TENANT_DEV_HEADER_SECRET?: string;

  /** Comma-separated IPs: when set, x-tenant-* headers in production require client IP to match. */
  @IsString()
  @IsOptional()
  TENANT_TRUSTED_HEADER_IPS?: string;

  @IsString()
  @IsOptional()
  SMTP_HOST?: string;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @IsOptional()
  SMTP_PORT?: number;

  @IsString()
  @IsOptional()
  SMTP_USER?: string;

  @IsString()
  @IsOptional()
  SMTP_PASS?: string;

  @IsString()
  @IsOptional()
  EMAIL_FROM?: string;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(60)
  @IsOptional()
  CMS_CACHE_TTL_SECONDS = 600;

  /** Optional; defaults to JWT_ACCESS_SECRET for CMS preview token signing. */
  @IsString()
  @IsOptional()
  CMS_PREVIEW_SECRET?: string;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(30)
  @IsOptional()
  PROMOTION_CACHE_TTL_SECONDS = 120;

  @IsIn(['PENDING', 'APPROVED'])
  @IsOptional()
  REVIEWS_DEFAULT_STATUS: 'PENDING' | 'APPROVED' = 'APPROVED';

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  @IsOptional()
  REVIEWS_EDIT_WINDOW_DAYS = 14;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(30)
  @IsOptional()
  REVIEWS_CACHE_TTL_SECONDS = 120;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  @IsOptional()
  REVIEWS_MAX_MEDIA_URLS = 5;
}

export function validateEnv(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  const isProduction = validatedConfig.NODE_ENV === 'production';
  if (isProduction) {
    const requiredSecrets: Array<[string, string | undefined]> = [
      ['JWT_ACCESS_SECRET', validatedConfig.JWT_ACCESS_SECRET],
      ['JWT_REFRESH_SECRET', validatedConfig.JWT_REFRESH_SECRET],
      ['DB_PASSWORD', validatedConfig.DB_PASSWORD],
      ['DEFAULT_ADMIN_PASSWORD', validatedConfig.DEFAULT_ADMIN_PASSWORD],
    ];

    for (const [key, value] of requiredSecrets) {
      if (!value || value.trim().length < 12) {
        throw new Error(`${key} must be set and strong in production.`);
      }
    }

    const forbiddenDefaults: Array<[string, string | undefined, string]> = [
      ['JWT_ACCESS_SECRET', validatedConfig.JWT_ACCESS_SECRET, 'access-secret'],
      [
        'JWT_REFRESH_SECRET',
        validatedConfig.JWT_REFRESH_SECRET,
        'refresh-secret',
      ],
      ['DB_PASSWORD', validatedConfig.DB_PASSWORD, 'postgres'],
    ];
    for (const [key, currentValue, defaultValue] of forbiddenDefaults) {
      if (currentValue?.trim() === defaultValue) {
        throw new Error(`${key} cannot use default value in production.`);
      }
    }

    const hasWildcardCors = validatedConfig.CORS_ALLOWED_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .some((origin) => origin === '*');
    if (hasWildcardCors) {
      throw new Error('CORS_ALLOWED_ORIGINS cannot contain "*" in production.');
    }
  }

  return validatedConfig;
}
