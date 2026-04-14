import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(private readonly configService: ConfigService) {}

  getServiceInfo() {
    return {
      service: 'api',
      status: 'ok',
      environment: this.configService.getOrThrow<string>('NODE_ENV'),
    };
  }
}
