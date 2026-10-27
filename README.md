# learning-crud-backend

REST API blog sederhana untuk belajar CRUD di **NestJS + TypeScript + MongoDB**.
Dua resource: `categories` dan `posts` (relasi 1 kategori -> banyak post).

## Stack

- NestJS 12 (Express 5) + TypeScript, ESM (`"type": "module"`)
- MongoDB via Mongoose 9 (`@nestjs/mongoose`)
- Validasi DTO: `class-validator` + `class-transformer`
- Test: vitest + supertest (unit & e2e)

## Endpoint

| Method | URL | Keterangan |
|---|---|---|
| POST | `/categories` | buat kategori (nama unik) |
| GET | `/categories` | daftar kategori |
| GET | `/categories/:id` | detail kategori |
| PATCH | `/categories/:id` | ubah kategori |
| DELETE | `/categories/:id` | hapus kategori (ditolak 400 kalau masih dipakai post) |
| POST | `/posts` | buat post (kategori harus ada) |
| GET | `/posts` | daftar post + nama kategorinya |
| GET | `/posts/:id` | detail post |
| PATCH | `/posts/:id` | ubah post |
| DELETE | `/posts/:id` | hapus post |

Status default Nest: POST -> 201, lainnya -> 200. Error yang ditangani: 400 (validasi / id bukan ObjectId /
kategori masih dipakai / kategori tidak ada), 404 (data tidak ada), 409 (duplikat nama kategori).

## Menjalankan

```bash
pnpm install
cp .env.example .env        # lalu sesuaikan MONGODB_URI kalau perlu
pnpm start:dev              # http://localhost:3000
```

MongoDB lokal:

```bash
brew services start mongodb-community     # atau: mongod --dbpath /tmp/blog-mongo
```

## Test

```bash
pnpm test        # unit test
pnpm test:e2e    # e2e, memakai database terpisah portfolio_blog_test
```

E2E memakai `.env.test`; `NODE_ENV=test` dipasang lewat `vitest.config.e2e.ts` supaya database development
tidak tersentuh.

## Dokumentasi langkah demi langkah

Penjelasan lengkap (scaffold, instalasi dependency, desain database, service, controller, DTO, module,
middleware, exception filter, cara menjalankan, uji curl, troubleshooting):
**[step-backend.md](./step-backend.md)**

## Struktur

```text
src/
├── app.module.ts        # Config + Mongoose + Categories/Posts + middleware
├── main.ts              # ValidationPipe + MongoExceptionFilter global
├── categories/          # controller, service, module, dto/, schemas/
├── posts/               # controller, service, module, dto/, schemas/
└── common/
    ├── filters/         # mongo-exception.filter.ts (400/409/500)
    └── middleware/      # logger.middleware.ts
test/
└── blog.e2e-spec.ts     # 9 skenario end-to-end
```
