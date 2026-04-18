import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { PromotionsActiveController } from '../src/modules/promotions/promotions-active.controller';
import { PromotionsApplicationService } from '../src/modules/promotions/promotions.application.service';

describe('PromotionsActiveController (integration)', () => {
  let app: INestApplication<App>;
  const promotionsApplication = {
    getActivePromotionsPublic: jest.fn().mockResolvedValue({
      campaigns: [],
      fetched_at: new Date().toISOString(),
    }),
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [PromotionsActiveController],
      providers: [
        {
          provide: PromotionsApplicationService,
          useValue: promotionsApplication,
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /promotions/active returns success', async () => {
    const res = await request(app.getHttpServer()).get('/promotions/active');
    expect(res.status).toBe(200);
    const body = res.body as {
      success: boolean;
      data: { campaigns: unknown[] };
    };
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('campaigns');
    expect(promotionsApplication.getActivePromotionsPublic).toHaveBeenCalled();
  });
});
