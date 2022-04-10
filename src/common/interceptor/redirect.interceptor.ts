import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import type { Observable } from 'rxjs';
import { map } from 'rxjs';
import type { Response } from 'express';
import { LoggerService } from '@/common/logger/logger.service';

@Injectable()
export class RedirectInterceptor implements NestInterceptor {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext(RedirectInterceptor.name);
  }

  intercept(_context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        const ctx = _context.switchToHttp();
        const res = ctx.getResponse<Response>();
        if (data?.redirect?.url) {
          const { type = 'HTTP', url, status = 302 } = data.redirect;
          this.logger.info(`Redirecting to ${url}, type: ${type}, status: ${status}`);
          if (type === 'HTTP') {
            res.header('Location', url);
            res.status(status);
            return '';
          }
          if (type === 'JS') {
            res.header('Content-Type', 'text/html');
            return `<script>window.location.href = '${url}'</script>`;
          }
        }
        throw new Error('RedirectInterceptor: redirect is not defined');
      }),
    );
  }
}
