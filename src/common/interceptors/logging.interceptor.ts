/**
 * LoggingInterceptor — ყოველი request-ის აღრიცხვა request-id-ით.
 *
 * WHY: როცა მომხმარებელი წერს "ვერ შეიქმნა გარიგება", ლოგებში ზუსტი
 * request-ის მოძებნა უნდა შეგეძლოს. `x-request-id` header-ი კლიენტსაც
 * უბრუნდება, ანუ შეცდომის რეპორტს id-იც მოყვება.
 *
 * ── Mechanism: Interceptor-ი Guard-ების **შემდეგ** და Pipe-ების **წინ**
 * მუშაობს, და მას RxJS stream-ზე წვდომა აქვს — ანუ შეუძლია request-ის
 * დასრულების შემდეგაც შეასრულოს კოდი (აქ: ხანგრძლივობის გაზომვა).
 */
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { Observable, tap } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    // თუ reverse proxy-მ უკვე დაგვიდო id, ვიყენებთ მას — ასე ერთი id
    // მთელ სისტემაში ერთ მოგზაურობას აღწერს (distributed tracing-ის საფუძველი).
    const requestId =
      (request.headers['x-request-id'] as string) ?? randomUUID();
    response.setHeader('x-request-id', requestId);

    const startedAt = Date.now();
    const { method, originalUrl } = request;

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.log(
            `${requestId} ${method} ${originalUrl} ${response.statusCode} ${Date.now() - startedAt}ms`,
          );
        },
        error: (error: { status?: number }) => {
          this.logger.warn(
            `${requestId} ${method} ${originalUrl} ${error?.status ?? 500} ${Date.now() - startedAt}ms`,
          );
        },
      }),
    );
  }
}
