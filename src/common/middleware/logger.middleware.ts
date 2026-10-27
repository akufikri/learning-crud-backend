import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

// Middleware = kode yang jalan SEBELUM request masuk ke controller.
// Di sini kita hanya mencatat method, url, status, dan durasi tiap request.
@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const started = Date.now();

    // event 'finish' baru terpanggil saat response sudah selesai dikirim,
    // jadi statusCode dan durasi sudah final di titik ini
    res.on('finish', () => {
      console.log(
        `[HTTP] ${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - started}ms`,
      );
    });

    // WAJIB dipanggil, kalau tidak request akan menggantung
    next();
  }
}
