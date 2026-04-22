import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { Express } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

function parseCorsOrigins(rawValue: string | undefined): string[] {
  if (!rawValue) {
    return [];
  }
  return rawValue
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

function shouldEnableSwagger(nodeEnv: string | undefined): boolean {
  const rawValue = (process.env.SWAGGER_ENABLED ?? '').trim().toLowerCase();
  if (rawValue === '1' || rawValue === 'true') {
    return true;
  }
  if (rawValue === '0' || rawValue === 'false') {
    return false;
  }
  return nodeEnv !== 'production';
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const nodeEnv = process.env.NODE_ENV;
  const isProduction = nodeEnv === 'production';

  if (process.env.TRUST_PROXY === '1' || process.env.TRUST_PROXY === 'true') {
    const server = app.getHttpAdapter().getInstance() as Express;
    server.set('trust proxy', 1);
  }

  app.use(helmet());

  const allowedOrigins = parseCorsOrigins(process.env.CORS_ALLOWED_ORIGINS);
  const corsOrigin = allowedOrigins.length > 0 ? allowedOrigins : !isProduction;

  app.enableCors({
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-idempotency-key'],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  if (shouldEnableSwagger(nodeEnv)) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Seventout API')
      .setDescription('API documentation for testing endpoints')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Input access token',
        },
        'access-token',
      )
      .build();
    const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, swaggerDocument);
  }

  await app.listen(process.env.PORT ?? 3001);
}
void bootstrap();
