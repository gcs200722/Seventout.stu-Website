import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (exception instanceof ForbiddenException) {
      response.status(HttpStatus.FORBIDDEN).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to access this resource',
        },
      });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      let message = exception.message;

      if (typeof payload === 'string') {
        message = payload;
      } else if (
        typeof payload === 'object' &&
        payload &&
        'message' in payload &&
        typeof payload.message === 'string'
      ) {
        message = payload.message;
      }

      response.status(status).json({
        success: false,
        error: {
          code: HttpStatus[status] ?? 'HTTP_EXCEPTION',
          message,
        },
      });
      return;
    }

    this.logger.error(
      `Unhandled exception at ${request.method} ${request.path}`,
      exception instanceof Error ? exception.stack : undefined,
    );
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
      },
    });
  }
}
