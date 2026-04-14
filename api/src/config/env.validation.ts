import { plainToInstance, Transform } from 'class-transformer';
import {
  IsEnum,
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

  @IsString()
  @IsOptional()
  AWS_ACCESS_KEY_ID?: string;

  @IsString()
  @IsOptional()
  AWS_SECRET_ACCESS_KEY?: string;

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

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(4)
  @IsOptional()
  PASSWORD_SALT_ROUNDS = 10;
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

  return validatedConfig;
}
