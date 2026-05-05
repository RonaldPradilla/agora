import { Injectable, NestInterceptor, ExecutionContext, CallHandler, RequestTimeoutException } from '@nestjs/common';
import { Observable, throwError, timeout, catchError } from 'rxjs';

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      timeout(11000),
      catchError((error) => {
        if (error.name === 'TimeoutError') {
          return throwError(() => new RequestTimeoutException('La petición tardó demasiado. Intenta de nuevo.'));
        }
        return throwError(() => error);
      }),
    );
  }
}
