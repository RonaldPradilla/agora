import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  BadRequestException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

interface ValidationError {
  field: string;
  message: string | string[];
}

interface ErrorResponse {
  statusCode: number;
  errors?: ValidationError[];
  message?: string;
}

@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse() as any;

    let errorResponse: ErrorResponse = {
      statusCode: status,
    };

    if (exceptionResponse.message && Array.isArray(exceptionResponse.message)) {
      // Si hay errores de validación
      errorResponse.errors = exceptionResponse.message.map((error: any) => ({
        field: error.property || 'unknown',
        message: error.constraints ? Object.values(error.constraints) : error.message,
      }));
    } else if (typeof exceptionResponse.message === 'string') {
      errorResponse.message = exceptionResponse.message;
    }

    response.status(status).json(errorResponse);
  }
}
