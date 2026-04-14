import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: {
            getServiceInfo: () => ({
              service: 'api',
              status: 'ok',
              environment: 'test',
            }),
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('health', () => {
    it('should return service metadata', () => {
      expect(appController.getHealth()).toEqual({
        service: 'api',
        status: 'ok',
        environment: 'test',
      });
    });
  });
});
