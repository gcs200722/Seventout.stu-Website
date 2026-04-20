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

      let errorCode = HttpStatus[status] ?? 'HTTP_EXCEPTION';
      let detailsOut: unknown = details;
      if (
        typeof details === 'object' &&
        details !== null &&
        'code' in details &&
        typeof (details as { code: unknown }).code === 'string'
      ) {
        errorCode = (details as { code: string }).code;
        const rest = { ...(details as Record<string, unknown>) };
        delete rest.code;
        detailsOut = Object.keys(rest).length > 0 ? rest : undefined;
      }

      response.status(status).json({
        success: false,
        error: {
          code: errorCode,
          message,
          ...(detailsOut !== undefined ? { details: detailsOut } : {}),
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
