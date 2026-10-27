import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import mongoose from 'mongoose';

// Filter ini hanya menangkap dua error khas MongoDB/Mongoose.
// Error lain tetap ditangani Nest seperti biasa.
@Catch(mongoose.Error.CastError, mongoose.mongo.MongoServerError)
export class MongoExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(MongoExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    // switchToHttp() mengambil object request/response bawaan Express
    const response = host.switchToHttp().getResponse<Response>();

    // CastError = id yang dikirim bukan format ObjectId (mis. /categories/abc)
    if (exception instanceof mongoose.Error.CastError) {
      response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: `Invalid id format: ${String(exception.value)}`,
      });
      return;
    }

    // code 11000 = duplicate key, mis. nama kategori yang sudah dipakai
    if (
      exception instanceof mongoose.mongo.MongoServerError &&
      exception.code === 11000
    ) {
      response.status(HttpStatus.CONFLICT).json({
        statusCode: HttpStatus.CONFLICT,
        message: 'Duplicate value: data already exists',
      });
      return;
    }

    this.logger.error(
      exception instanceof Error ? exception.message : String(exception),
    );
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    });
  }
}
