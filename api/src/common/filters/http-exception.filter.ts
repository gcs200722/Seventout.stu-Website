import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
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

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      let message = exception.message;
      let details: unknown;

      if (typeof payload === 'string') {
        message = payload;
      } else if (
        typeof payload === 'object' &&
        payload &&
        'message' in payload
      ) {
        if (typeof payload.message === 'string') {
          message = payload.message;
        } else if (
          Array.isArray(payload.message) &&
          payload.message.length > 0 &&
          typeof payload.message[0] === 'string'
        ) {
          message = payload.message.join(', ');
        }
      }

      if (
        typeof payload === 'object' &&
        payload &&
        'details' in payload &&
        payload.details !== undefined
      ) {
        details = payload.details;
      }

      response.status(status).json({
        success: false,
        error: {
          code: HttpStatus[status] ?? 'HTTP_EXCEPTION',
          message,
          ...(details !== undefined ? { details } : {}),
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
