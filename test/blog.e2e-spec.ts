import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Connection, Types } from 'mongoose';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { MongoExceptionFilter } from './../src/common/filters/mongo-exception.filter.js';

describe('Blog API (e2e)', () => {
  let app: INestApplication<App>;
  // id disimpan di variabel supaya bisa dipakai di test berikutnya
  let categoryId: string;
  let postId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // ⚠️ pipe dan filter global TIDAK ikut otomatis di app hasil testing,
    // jadi harus dipasang manual persis seperti di src/main.ts
    app.useGlobalFilters(new MongoExceptionFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    // mulai dari database kosong supaya test bisa dijalankan berulang kali.
    // NODE_ENV=test dipasang di vitest.config.e2e.ts -> .env.test -> portfolio_blog_test
    const connection = app.get<Connection>(getConnectionToken());
    await connection.dropDatabase();

    // dropDatabase() ikut menghapus index (termasuk unique index `name`),
    // jadi index harus dibuat ulang supaya test duplikat benar-benar 409.
    await Promise.all(
      Object.values(connection.models).map((model) => model.createIndexes()),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /categories --> 201 membuat kategori baru', async () => {
    const res = await request(app.getHttpServer())
      .post('/categories')
      .send({ name: 'Backend' })
      .expect(201);

    const body = res.body as { _id: string; name: string };
    expect(body.name).toBe('Backend');
    expect(body._id).toBeDefined();

    categoryId = body._id;
  });

  it('POST /posts --> 201 membuat post dengan kategori yang ada', async () => {
    const res = await request(app.getHttpServer())
      .post('/posts')
      .send({
        title: 'Belajar NestJS',
        content: 'Isi artikel pertama',
        categoryId,
      })
      .expect(201);

    const body = res.body as { _id: string; title: string };
    expect(body.title).toBe('Belajar NestJS');

    postId = body._id;
  });

  it('GET /posts/:id --> 200 dan categoryId sudah di-populate', async () => {
    const res = await request(app.getHttpServer())
      .get(`/posts/${postId}`)
      .expect(200);

    const body = res.body as { categoryId: { _id: string; name: string } };
    expect(body.categoryId.name).toBe('Backend');
  });

  it('PATCH /posts/:id --> 200 mengubah isPublished', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/posts/${postId}`)
      .send({ isPublished: true })
      .expect(200);

    const body = res.body as { isPublished: boolean };
    expect(body.isPublished).toBe(true);
  });

  it('POST /categories dengan nama sama --> 409 duplicate', async () => {
    await request(app.getHttpServer())
      .post('/categories')
      .send({ name: 'Backend' })
      .expect(409);
  });

  it('POST /posts dengan categoryId yang tidak ada --> 400', async () => {
    await request(app.getHttpServer())
      .post('/posts')
      .send({
        title: 'Judul',
        content: 'Isi',
        categoryId: new Types.ObjectId().toString(),
      })
      .expect(400);
  });

  it('GET /categories/not-an-id --> 400 bukan ObjectId', async () => {
    await request(app.getHttpServer()).get('/categories/not-an-id').expect(400);
  });

  it('DELETE /categories/:id saat masih ada post --> 400', async () => {
    await request(app.getHttpServer())
      .delete(`/categories/${categoryId}`)
      .expect(400);
  });

  it('DELETE /posts/:id lalu DELETE /categories/:id --> 200', async () => {
    await request(app.getHttpServer()).delete(`/posts/${postId}`).expect(200);
    await request(app.getHttpServer())
      .delete(`/categories/${categoryId}`)
      .expect(200);
  });
});
