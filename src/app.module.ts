import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { CategoriesModule } from './categories/categories.module.js';
import { LoggerMiddleware } from './common/middleware/logger.middleware.js';
import { PostsModule } from './posts/posts.module.js';

@Module({
  imports: [
    // isGlobal: true -> ConfigService bisa dipakai di module mana pun tanpa import ulang
    // envFilePath dibaca berurutan; file yang lebih depan menang kalau variabelnya sama
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV ?? 'development'}`, '.env'],
    }),

    // forRootAsync dipakai karena URI baru diketahui setelah .env dibaca
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
    }),

    CategoriesModule,
    PostsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // '{*splat}' = semua rute. Ini sintaks wildcard Express 5 / path-to-regexp 8.
    consumer.apply(LoggerMiddleware).forRoutes('{*splat}');
  }
}
