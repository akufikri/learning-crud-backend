import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { MongoExceptionFilter } from './common/filters/mongo-exception.filter.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // urutan pasang bebas, tapi harus sebelum listen() supaya berlaku untuk request pertama
  app.useGlobalFilters(new MongoExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // buang field yang tidak ada di DTO
      forbidNonWhitelisted: true, // kalau ada field asing, langsung 400
      transform: true, // ubah payload jadi instance DTO (dibutuhkan validasi & PartialType)
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
