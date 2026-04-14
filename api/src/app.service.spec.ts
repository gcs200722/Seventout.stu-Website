import { AppService } from './app.service';

describe('AppService', () => {
  it('should return service info payload', () => {
    const configService = {
      getOrThrow: jest.fn().mockReturnValue('test'),
    };

    const service = new AppService(configService as never);

    expect(service.getServiceInfo()).toEqual({
      service: 'api',
      status: 'ok',
      environment: 'test',
    });
  });
});
