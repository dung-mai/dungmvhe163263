import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { AppLogger } from '../infrastructure/app-logger';
import { ProductNotFoundError } from '../modules/catalog/domain/catalog.repository';
interface HttpRequest {
  id?: string;
}
interface HttpResponse {
  status(code: number): HttpResponse;
  json(body: unknown): void;
}
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: AppLogger) {}
  catch(error: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const request = http.getRequest<HttpRequest>();
    const response = http.getResponse<HttpResponse>();
    const statusCode =
      error instanceof HttpException
        ? error.getStatus()
        : error instanceof ProductNotFoundError
          ? 404
          : 500;
    const details = error instanceof HttpException ? error.getResponse() : null;
    const message =
      details && typeof details === 'object' && 'message' in details
        ? details.message
        : statusCode === 404
          ? 'Không tìm thấy sản phẩm'
          : statusCode >= 500
            ? 'Có lỗi hệ thống. Vui lòng thử lại.'
            : String(details);
    if (statusCode >= 500)
      this.logger.raw.error({ err: error, requestId: request.id }, 'Request failed');
    response.status(statusCode).json({ statusCode, message, requestId: request.id ?? 'unknown' });
  }
}
