# Blog Backend NestJS (Posts + Categories)

Catatan belajar membuat REST API blog dengan **NestJS + TypeScript + MongoDB**.
Ada dua resource: `categories` dan `posts` (relasi 1 kategori -> banyak post).

Urutan dokumen mengikuti urutan pengerjaan: scaffold -> desain database -> koneksi -> service -> controller ->
DTO -> module -> middleware -> exception filter -> menjalankan -> uji curl -> troubleshooting.

> Semua blok kode di bawah **disalin apa adanya** dari file di repo ini. Kalau bingung, bandingkan dengan file aslinya.

---

## 1. Prasyarat

| Alat | Versi yang dipakai | Cek dengan |
|---|---|---|
| Node.js | 26.x | `node -v` |
| pnpm | 11.x | `pnpm -v` |
| MongoDB | 7.x lokal **atau** MongoDB Atlas | `mongosh --quiet --eval 'db.runCommand({ping:1})'` |

Install MongoDB lokal di macOS:

```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

Kalau `brew services start` menolak dengan pesan `Refusing to load formula ... from untrusted tap`:

```bash
brew trust mongodb/brew
brew services start mongodb-community
```

Atau jalankan langsung tanpa service (cukup untuk latihan):

```bash
mkdir -p /tmp/blog-mongo
mongod --dbpath /tmp/blog-mongo --port 27017
```

> **Catatan soal binary `nest` global.** Kalau `nest` global error `MODULE_NOT_FOUND`, jangan dipaksa.
> Semua perintah di dokumen ini pakai `pnpm exec nest ...`, yang memakai CLI dari `node_modules` project
> sehingga versinya selalu cocok dengan versi Nest project.

---

## 2. Scaffold project + instalasi dependency

Buat project baru (jalankan dari folder induk, bukan di dalam folder project):

```bash
npx --yes @nestjs/cli@12 new blog-backend-nest --package-manager pnpm --strict
cd blog-backend-nest
```

Arti flag-nya:

- `--package-manager pnpm` -> yang dibuat `pnpm-lock.yaml` (bukan `package-lock.json`).
- `--strict` -> `tsconfig.json` memakai `"strict": true` (type checking ketat, bagus untuk belajar).

Template Nest 12 sudah menyiapkan hampir semuanya:

- `"type": "module"` di `package.json` -> project ini **ESM**. Semua import file lokal **wajib** berakhiran
  `.js` (contoh `import { AppModule } from './app.module.js';`) walaupun file sumbernya `.ts`.
- `vitest.config.ts` + `vitest.config.e2e.ts` -> test runner-nya **vitest**, bukan jest.
- Script `test`, `test:e2e`, `lint`, `format` sudah tersedia.

Install dependency tambahan untuk MongoDB dan validasi:

```bash
pnpm add @nestjs/mongoose mongoose @nestjs/config class-validator class-transformer
pnpm add @nestjs/mapped-types
```

- `pnpm add <paket>` = **dependency runtime** (dipakai saat aplikasi jalan).
- `pnpm add -D <paket>` = **devDependency** (hanya untuk development/test).
- Hapus paket: `pnpm remove <paket>` (tambahkan `-D` kalau paketnya devDependency).

Kalau pnpm 11 meminta `pnpm approve-builds`, itu tanda ada paket yang punya postinstall script.
Daftar dependency di bawah tidak memerlukannya.

### Daftar dependency (hasil `pnpm list --depth 0`)

| Paket | Jenis | Versi terpasang | Dipakai untuk |
|---|---|---|---|
| `@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express` | runtime (bawaan) | 12.2.0 | runtime Nest + HTTP server Express 5 |
| `reflect-metadata`, `rxjs` | runtime (bawaan) | 0.2.2 / 7.8.2 | decorator Nest + `Observable` |
| `@nestjs/config` | runtime (tambahan) | 12.0.1 | baca `.env` (`MONGODB_URI`, `PORT`) |
| `@nestjs/mongoose` | runtime (tambahan) | 12.0.0 | integrasi Mongoose: `forRootAsync`, `forFeature`, `@Prop`, `@InjectModel` |
| `mongoose` | runtime (tambahan) | 9.11.4 | ODM MongoDB: `Model`, `Schema`, `ObjectId` |
| `class-validator` | runtime (tambahan) | 0.15.1 | aturan validasi di DTO (`@IsString`, `@IsMongoId`, ...) |
| `class-transformer` | runtime (tambahan) | 0.5.1 | `transform: true` di `ValidationPipe` |
| `@nestjs/mapped-types` | runtime (tambahan) | 12.0.0 | `PartialType` untuk DTO update |
| `@nestjs/cli`, `@nestjs/schematics`, `typescript` | dev (bawaan) | 12.0.10 / 12.0.10 / 6.0.3 | compile + generator kode |
| `vitest`, `vite`, `@vitest/coverage-v8`, `supertest`, `@types/supertest` | dev (bawaan) | 4.1.12 / 8.3.5 / 4.1.12 / 7.3.1 / 7.2.1 | unit + e2e test |
| `oxlint`, `prettier` | dev (bawaan) | 1.89.0 / 3.9.10 | lint + format |

> `@nestjs/mapped-types` **harus di-install sendiri**. Beberapa tutorial menyebut paket ini "ikut terpasang
> bersama `@nestjs/mongoose`", tapi pnpm tidak membocorkan dependency transitif — import-nya akan gagal kalau
> tidak dipasang eksplisit.

Yang ikut di-commit: `package.json`, `pnpm-lock.yaml`, `.env.example`, `.env.test`.
Yang tidak boleh di-commit: `node_modules/`, `dist/`, `.env` (semua sudah ada di `.gitignore`).

---

## 3. Generate kerangka module / controller / service

```bash
pnpm exec nest g module categories
pnpm exec nest g controller categories --no-spec
pnpm exec nest g service categories --no-spec

pnpm exec nest g module posts
pnpm exec nest g controller posts --no-spec
pnpm exec nest g service posts --no-spec
```

- `g` = generate. `--no-spec` = jangan buat file test otomatis (test e2e kita tulis sendiri di langkah 12).
- `nest g module` otomatis mendaftarkan module baru ke `imports` di `src/app.module.ts`.
- Shortcut: `pnpm exec nest g resource posts` membuat module + controller + service + DTO sekaligus.
  Di latihan ini kita buat satu per satu supaya setiap file terlihat.

Struktur akhir:

```text
src/
|-- app.controller.ts          # GET / (health check bawaan template)
|-- app.module.ts              # root module: Config, Mongoose, Categories, Posts, middleware
|-- app.service.ts
|-- main.ts                    # bootstrap: ValidationPipe + exception filter global
|-- categories/
|   |-- categories.controller.ts
|   |-- categories.module.ts
|   |-- categories.service.ts
|   |-- dto/
|   |   |-- create-category.dto.ts
|   |   `-- update-category.dto.ts
|   `-- schemas/
|       `-- category.schema.ts
|-- common/
|   |-- filters/mongo-exception.filter.ts
|   `-- middleware/logger.middleware.ts
`-- posts/
    |-- posts.controller.ts
    |-- posts.module.ts
    |-- posts.service.ts
    |-- dto/
    |   |-- create-post.dto.ts
    |   `-- update-post.dto.ts
    `-- schemas/post.schema.ts
test/
`-- blog.e2e-spec.ts
```

---

## 4. Desain database

Dua collection, relasi **1-N**: satu kategori punya banyak post, satu post hanya punya satu kategori.
MongoDB tidak punya foreign key, jadi pengecekan relasi dilakukan di service (bukan oleh database).

```dbml
Table categories {
  _id         ObjectId [pk]
  name        string   [not null, unique, max: 60]
  description string   [max: 300]
  createdAt   datetime
  updatedAt   datetime
}

Table posts {
  _id         ObjectId [pk]
  title       string   [not null, max: 150]
  content     string   [not null]
  categoryId  ObjectId [not null, ref: > categories._id]
  isPublished boolean  [not null, default: false]
  createdAt   datetime
  updatedAt   datetime
}
```

Mau lihat diagramnya? Buka <https://dbdiagram.io>, klik **Import -> DBML**, tempel blok di atas.

Catatan:

- `_id` dibuat otomatis oleh MongoDB (bukan auto increment).
- `createdAt` / `updatedAt` diisi otomatis karena schema memakai opsi `timestamps: true`.
- Index `unique` pada `name` dibuat oleh `unique: true` di `@Prop`; index `categoryId` oleh `index: true`.
- Relasi `posts.categoryId -> categories._id` bertipe ObjectId, bukan string. Ini penting (lihat langkah 14).

---

## 5. Koneksi MongoDB

Tiga file environment: `.env` untuk sehari-hari (tidak di-commit), `.env.example` contoh untuk orang lain,
`.env.test` khusus test (di-commit, tanpa secret).

`.env`:

```text
MONGODB_URI=mongodb://127.0.0.1:27017/portfolio_blog
PORT=3000
```

`.env.example`:

```text
# Alamat MongoDB yang dipakai aplikasi.
# Ganti dengan URI Atlas kalau tidak pakai MongoDB lokal, contoh:
# MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/portfolio_blog
MONGODB_URI=mongodb://127.0.0.1:27017/portfolio_blog
PORT=3000
```

`.env.test`:

```text
# Database khusus test. Isinya dihapus (dropDatabase) setiap kali `pnpm test:e2e` jalan,
# jadi JANGAN arahkan ke database yang isinya penting.
MONGODB_URI=mongodb://127.0.0.1:27017/portfolio_blog_test
```

Kalau pakai MongoDB Atlas, ganti URI-nya jadi `mongodb+srv://user:pass@cluster.mongodb.net/portfolio_blog`.

Lalu sambungkan di `src/app.module.ts`:

```ts
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
```

Yang perlu dipahami:

- `ConfigModule.forRoot({ envFilePath: [...] })` membaca file `.env` **saat module di-import**, bukan saat
  `NestFactory.create()` dipanggil. Urutan array = prioritas: file paling depan menang kalau variabelnya sama.
  Jadi `NODE_ENV=test` -> yang dibaca `.env.test` dulu, lalu `.env` sebagai pelengkap.
- `MongooseModule.forRootAsync` dipakai (bukan `forRoot`) karena `MONGODB_URI` baru terbaca setelah
  `ConfigService` hidup. Hasilnya satu koneksi MongoDB untuk seluruh aplikasi.
- `MongooseModule.forFeature([...])` ada di module masing-masing: mendaftarkan **Model** yang bisa
  di-`@InjectModel` di service. `forRoot` = koneksi, `forFeature` = model.

---

## 6. Services (logika bisnis)

Urutan enak dibaca: `create` -> `findAll` -> `findOne` -> `update` -> `remove`.

| Method | Categories | Posts |
|---|---|---|
| `create(dto)` | simpan kategori baru | cek kategori ada, lalu simpan post |
| `findAll()` | semua kategori, terbaru dulu | semua post + data kategori (`populate`) |
| `findOne(id)` | cari 1, kalau tidak ada -> 404 | cari 1 + `populate`, kalau tidak ada -> 404 |
| `update(id, dto)` | update partial, validasi schema tetap jalan | kalau `categoryId` dikirim, cek kategorinya dulu |
| `remove(id)` | ditolak kalau masih dipakai post | hapus post |

Dua exception Nest yang dipakai:

- `NotFoundException` -> **404**, data tidak ditemukan.
- `BadRequestException` -> **400**, permintaan ditolak karena aturan bisnis (kategori masih dipakai post,
  atau `categoryId` tidak ada).

`src/categories/categories.service.ts`:

```ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Post } from '../posts/schemas/post.schema.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';
import { Category } from './schemas/category.schema.js';

@Injectable() // Injectable = class ini boleh di-inject ke tempat lain oleh Nest
export class CategoriesService {
  constructor(
    // Model<Category> adalah "pintu" untuk query ke collection categories
    @InjectModel(Category.name) private readonly categoryModel: Model<Category>,
    // Model<Post> dipakai hanya untuk mengecek apakah kategori masih dipakai post
    @InjectModel(Post.name) private readonly postModel: Model<Post>,
  ) {}

  async create(createCategoryDto: CreateCategoryDto) {
    // new + save() menjalankan validasi schema (required, maxlength, unique)
    return new this.categoryModel(createCategoryDto).save();
  }

  async findAll() {
    // createdAt: -1 -> data terbaru muncul paling atas
    return this.categoryModel.find().sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string) {
    const category = await this.categoryModel.findById(id).exec();
    // null artinya data tidak ada -> 404
    if (!category) {
      throw new NotFoundException(`Category ${id} not found`);
    }
    return category;
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    const category = await this.categoryModel
      .findByIdAndUpdate(id, updateCategoryDto, {
        returnDocument: 'after', // kembalikan data SETELAH diubah, bukan sebelum
        runValidators: true, // tetap jalankan maxlength/required dari schema
      })
      .exec();

    if (!category) {
      throw new NotFoundException(`Category ${id} not found`);
    }
    return category;
  }

  async remove(id: string) {
    // findOne sekaligus memastikan datanya ada (kalau tidak ada -> 404)
    const category = await this.findOne(id);

    // kategori tidak boleh dihapus kalau masih ada post yang memakainya
    const postCount = await this.postModel
      .countDocuments({ categoryId: category._id })
      .exec();

    if (postCount > 0) {
      // 400 Bad Request: permintaan ditolak karena aturan bisnis
      throw new BadRequestException('Category still has posts');
    }

    await this.categoryModel.deleteOne({ _id: category._id }).exec();
    return { message: 'Category deleted successfully', category };
  }
}
```

`src/posts/posts.service.ts`:

```ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category } from '../categories/schemas/category.schema.js';
import { CreatePostDto } from './dto/create-post.dto.js';
import { UpdatePostDto } from './dto/update-post.dto.js';
import { Post } from './schemas/post.schema.js';

@Injectable()
export class PostsService {
  constructor(
    @InjectModel(Post.name) private readonly postModel: Model<Post>,
    @InjectModel(Category.name) private readonly categoryModel: Model<Category>,
  ) {}

  // MongoDB tidak punya foreign key otomatis, jadi relasi harus dicek manual
  private async ensureCategoryExists(categoryId: string) {
    const exists = await this.categoryModel.exists({ _id: categoryId }).exec();
    if (!exists) {
      throw new BadRequestException('Category not found');
    }
  }

  async create(createPostDto: CreatePostDto) {
    await this.ensureCategoryExists(createPostDto.categoryId);
    return new this.postModel(createPostDto).save();
  }

  async findAll() {
    // populate = JOIN: categoryId diganti jadi { _id, name }
    return this.postModel
      .find()
      .populate('categoryId', 'name')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string) {
    const post = await this.postModel
      .findById(id)
      .populate('categoryId', 'name')
      .exec();

    if (!post) {
      throw new NotFoundException(`Post ${id} not found`);
    }
    return post;
  }

  async update(id: string, updatePostDto: UpdatePostDto) {
    // kalau kategori ikut diubah, pastikan kategorinya benar-benar ada
    if (updatePostDto.categoryId) {
      await this.ensureCategoryExists(updatePostDto.categoryId);
    }

    const post = await this.postModel
      .findByIdAndUpdate(id, updatePostDto, {
        returnDocument: 'after',
        runValidators: true,
      })
      .populate('categoryId', 'name')
      .exec();

    if (!post) {
      throw new NotFoundException(`Post ${id} not found`);
    }
    return post;
  }

  async remove(id: string) {
    const post = await this.findOne(id);
    await this.postModel.deleteOne({ _id: post._id }).exec();
    return { message: 'Post deleted successfully', post };
  }
}
```

Catatan penting:

- `populate('categoryId', 'name')` itu "JOIN" versi Mongoose: `categoryId` yang tadinya hanya id berubah jadi
  object `{ _id, name }`.
- `runValidators: true` wajib di `findByIdAndUpdate`, kalau tidak `maxlength`/`required` di schema dilewati.
- `returnDocument: 'after'` = kembalikan dokumen setelah diubah. Opsi lama `new: true` sudah deprecated di
  Mongoose 9 dan memunculkan warning.

---

## 7. Controllers (rute)

`src/categories/categories.controller.ts`:

```ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CategoriesService } from './categories.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';

// 'categories' jadi prefix semua rute di controller ini -> /categories
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoriesService.create(createCategoryDto);
  }

  @Get()
  findAll() {
    return this.categoriesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(id, updateCategoryDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }
}
```

`src/posts/posts.controller.ts`:

```ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CreatePostDto } from './dto/create-post.dto.js';
import { UpdatePostDto } from './dto/update-post.dto.js';
import { PostsService } from './posts.service.js';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  createPost(@Body() createPostDto: CreatePostDto) {
    return this.postsService.create(createPostDto);
  }

  @Get()
  findAllPosts() {
    return this.postsService.findAll();
  }

  @Get(':id')
  findOnePost(@Param('id') id: string) {
    return this.postsService.findOne(id);
  }

  @Patch(':id')
  updatePost(@Param('id') id: string, @Body() updatePostDto: UpdatePostDto) {
    return this.postsService.update(id, updatePostDto);
  }

  @Delete(':id')
  removePost(@Param('id') id: string) {
    return this.postsService.remove(id);
  }
}
```

Rute yang dihasilkan:

| Resource | Method | URL | Body | Status sukses |
|---|---|---|---|---|
| Categories | POST | `/categories` | `name`, `description?` | 201 |
| Categories | GET | `/categories` | - | 200 |
| Categories | GET | `/categories/:id` | - | 200 |
| Categories | PATCH | `/categories/:id` | sebagian field create | 200 |
| Categories | DELETE | `/categories/:id` | - | 200 |
| Posts | POST | `/posts` | `title`, `content`, `categoryId`, `isPublished?` | 201 |
| Posts | GET | `/posts` | - | 200 |
| Posts | GET | `/posts/:id` | - | 200 |
| Posts | PATCH | `/posts/:id` | sebagian field create | 200 |
| Posts | DELETE | `/posts/:id` | - | 200 |

Status 201 untuk POST dan 200 untuk sisanya adalah default Nest, jadi tidak perlu `@HttpCode`.

---

## 8. DTO (validasi input)

DTO = class yang mendeskripsikan body request. `ValidationPipe` membaca decorator-nya, jadi request yang salah
ditolak **sebelum** masuk ke service.

`src/categories/dto/create-category.dto.ts`:

```ts
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

// DTO = bentuk data yang diterima dari request body.
// Decorator di bawah dipakai oleh ValidationPipe untuk menolak request yang salah.
export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty({ message: 'name is required' })
  @MaxLength(60)
  name: string;

  @IsOptional() // boleh tidak dikirim
  @IsString()
  @MaxLength(300)
  description?: string;
}
```

`src/categories/dto/update-category.dto.ts`:

```ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateCategoryDto } from './create-category.dto.js';

// PartialType membuat semua field CreateCategoryDto jadi optional,
// jadi PATCH boleh kirim sebagian field saja.
export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}
```

`src/posts/dto/create-post.dto.ts`:

```ts
import {
  IsBoolean,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreatePostDto {
  @IsString()
  @IsNotEmpty({ message: 'title is required' })
  @MaxLength(150)
  title: string;

  @IsString()
  @IsNotEmpty({ message: 'content is required' })
  content: string;

  // IsMongoId memastikan format id 24 karakter hex, bukan sembarang string
  @IsMongoId({ message: 'categoryId must be a valid Mongo id' })
  categoryId: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
```

`src/posts/dto/update-post.dto.ts`:

```ts
import { PartialType } from '@nestjs/mapped-types';
import { CreatePostDto } from './create-post.dto.js';

export class UpdatePostDto extends PartialType(CreatePostDto) {}
```

| DTO | Field | Validator | Pesan / efek |
|---|---|---|---|
| CreateCategoryDto | `name` | `@IsString` `@IsNotEmpty` `@MaxLength(60)` | `name is required` |
| CreateCategoryDto | `description?` | `@IsOptional` `@IsString` `@MaxLength(300)` | boleh tidak dikirim |
| CreatePostDto | `title` | `@IsString` `@IsNotEmpty` `@MaxLength(150)` | `title is required` |
| CreatePostDto | `content` | `@IsString` `@IsNotEmpty` | `content is required` |
| CreatePostDto | `categoryId` | `@IsMongoId` | `categoryId must be a valid Mongo id` |
| CreatePostDto | `isPublished?` | `@IsOptional` `@IsBoolean` | default `false` dari schema |
| UpdateCategoryDto | semua field create | `PartialType(...)` | otomatis jadi optional |
| UpdatePostDto | semua field create | `PartialType(...)` | otomatis jadi optional |

`PartialType` (dari `@nestjs/mapped-types`) menyalin semua decorator DTO create lalu menambahkan `@IsOptional`
ke tiap field. Itulah sebabnya PATCH cukup mengirim field yang mau diubah saja.

Tiga opsi `ValidationPipe` di `src/main.ts`:

- `whitelist: true` -> field yang tidak ada di DTO dibuang.
- `forbidNonWhitelisted: true` -> kalau ada field asing, langsung 400 (`property hack should not exist`).
- `transform: true` -> payload diubah jadi instance DTO (dibutuhkan `PartialType` dan konversi tipe).

---

## 9. Modules

Alur satu request:

```text
HTTP request
   |
   v
Controller        <- hanya urus HTTP: rute, @Body, @Param
   |  memanggil
   v
Service           <- logika bisnis + aturan (404, 400, cek relasi)
   |  memakai
   v
Model (Mongoose)  <- query ke collection
   |
   v
MongoDB
```

`src/categories/categories.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Post, PostSchema } from '../posts/schemas/post.schema.js';
import { CategoriesController } from './categories.controller.js';
import { CategoriesService } from './categories.service.js';
import { Category, CategorySchema } from './schemas/category.schema.js';

@Module({
  imports: [
    // forFeature mendaftarkan Model supaya bisa dipakai @InjectModel di service
    MongooseModule.forFeature([
      { name: Category.name, schema: CategorySchema },
      { name: Post.name, schema: PostSchema },
    ]),
  ],
  controllers: [CategoriesController],
  providers: [CategoriesService],
})
export class CategoriesModule {}
```

`src/posts/posts.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Category, CategorySchema } from '../categories/schemas/category.schema.js';
import { PostsController } from './posts.controller.js';
import { PostsService } from './posts.service.js';
import { Post, PostSchema } from './schemas/post.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Post.name, schema: PostSchema },
      { name: Category.name, schema: CategorySchema },
    ]),
  ],
  controllers: [PostsController],
  providers: [PostsService],
})
export class PostsModule {}
```

Kenapa `forFeature` ada di module, bukan di service? Karena dependency injection Nest berbasis module: provider
(Model) didaftarkan di module yang sama dengan service yang memakainya, lalu service mengambilnya lewat
`@InjectModel(Nama.name)`. Itu sebabnya kedua module mendaftarkan dua model — `CategoriesService` butuh `Post`
(untuk cek "masih ada post?"), dan `PostsService` butuh `Category` (untuk cek kategori ada).

Tidak ada `exports` karena tidak ada module lain yang memakai service ini.

---

## 10. Middleware (logger sederhana)

`src/common/middleware/logger.middleware.ts`:

```ts
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
```

Middleware dipasang lewat method `configure()` di `AppModule` (lihat `src/app.module.ts` di langkah 5):

```ts
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('{*splat}');
  }
}
```

Kenapa `'{*splat}'` dan bukan `'*'`? Karena `@nestjs/platform-express` sekarang memakai Express 5
(`path-to-regexp` 8), yang menolak pola `'*'` dengan error `TypeError: Missing parameter name`.
Bentuk wildcard yang benar di Express 5 adalah `'{*splat}'` (parameter bernama `splat`).
Kalau suatu saat pola ini bermasalah, pasang per controller saja:
`consumer.apply(LoggerMiddleware).forRoutes(CategoriesController, PostsController)`.

Bukti middleware jalan (muncul di terminal `pnpm start:dev`):

```text
[HTTP] GET /posts 200 22ms
[HTTP] POST /categories 201 12ms
```

---

## 11. Exception filter (error MongoDB -> HTTP)

`src/common/filters/mongo-exception.filter.ts`:

```ts
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
```

Dipasang global di `src/main.ts`:

```ts
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
```

Yang ditangani:

| Error dari Mongoose | Penyebab | Response |
|---|---|---|
| `CastError` | `:id` bukan ObjectId, mis. `/categories/abc` | 400 `Invalid id format: abc` |
| `MongoServerError` code `11000` | unique index dilanggar, mis. nama kategori dobel | 409 `Duplicate value: data already exists` |
| selain itu | bug tak terduga | 500 `Internal server error` (detail masuk log) |

Tanpa filter ini, `CastError` dan duplicate key sama-sama jadi 500 — dua-duanya status yang salah.

---

## 12. Menjalankan

1. Pastikan MongoDB jalan:

   ```bash
   mongosh --quiet --eval 'db.runCommand({ping:1})'   # harus { ok: 1 }
   ```

2. Jalankan aplikasi (watch mode, otomatis restart kalau file berubah):

   ```bash
   pnpm start:dev
   ```

   Tunggu sampai muncul `Nest application successfully started`, lalu buka <http://localhost:3000> ->
   `Hello World!` (health check bawaan template).

3. Jalankan test e2e (butuh MongoDB jalan):

   ```bash
   pnpm test:e2e
   ```

   Hasil yang diharapkan: `Tests 9 passed (9)`.

   Test memakai database terpisah (`portfolio_blog_test`) dan mengosongkannya di awal, jadi database
   development tidak tersentuh. `NODE_ENV=test` dipasang di `vitest.config.e2e.ts`:

   ```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // ConfigModule membaca file .env saat AppModule di-import (bukan saat compile()),
    // jadi NODE_ENV harus sudah "test" sebelum file test di-load -> pakai env ini,
    // supaya yang terbaca adalah .env.test (database portfolio_blog_test).
    env: { NODE_ENV: 'test' },
  },
});
```

   Alasannya: `ConfigModule` membaca `.env` saat `AppModule` di-import. Kalau `NODE_ENV` diset di dalam
   `beforeAll`, itu sudah terlambat — yang terbaca tetap `.env` (database development), lalu `dropDatabase()`
   di test akan menghapus data development.

4. Isi `test/blog.e2e-spec.ts` (9 skenario berurutan):

```ts
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
```

---

## 13. Uji manual dengan curl

Semua contoh memakai `-s` (senyap) dan `-w '\n%{http_code}\n'` supaya status code ikut tercetak.

**1) Buat kategori** (harus **201**; catat `_id` dari response):

```bash
curl -s -X POST localhost:3000/categories \
  -H 'Content-Type: application/json' \
  -d '{"name":"Backend"}' -w '\n%{http_code}\n'
```

**2) Buat post** (harus **201**; ganti `<ID_KATEGORI>` dengan `_id` langkah 1):

```bash
curl -s -X POST localhost:3000/posts \
  -H 'Content-Type: application/json' \
  -d '{"title":"Hello","content":"Isi artikel","categoryId":"<ID_KATEGORI>"}' \
  -w '\n%{http_code}\n'
```

**3) Lihat semua post** (harus **200**, `categoryId` sudah jadi object `{ _id, name }`):

```bash
curl -s localhost:3000/posts -w '\n%{http_code}\n'
```

**4) Ubah post jadi published** (harus **200**):

```bash
curl -s -X PATCH localhost:3000/posts/<ID_POST> \
  -H 'Content-Type: application/json' \
  -d '{"isPublished":true}' -w '\n%{http_code}\n'
```

**5) Coba kategori dobel** (harus **409**):

```bash
curl -s -X POST localhost:3000/categories \
  -H 'Content-Type: application/json' \
  -d '{"name":"Backend"}' -w '\n%{http_code}\n'
```

**6) Coba id ngawur** (harus **400**):

```bash
curl -s localhost:3000/categories/abc -w '\n%{http_code}\n'
```

**7) Hapus kategori yang masih punya post** (harus **400**):

```bash
curl -s -X DELETE localhost:3000/categories/<ID_KATEGORI> -w '\n%{http_code}\n'
```

**8) Hapus post dulu, baru kategorinya** (dua-duanya **200**):

```bash
curl -s -X DELETE localhost:3000/posts/<ID_POST> -w '\n%{http_code}\n'
curl -s -X DELETE localhost:3000/categories/<ID_KATEGORI> -w '\n%{http_code}\n'
```

Contoh output langkah 1:

```text
{"_id":"6ae0cff690466f14cb01f5a3","name":"Backend","createdAt":"2026-10-27T16:23:19.021Z","updatedAt":"2026-10-27T16:23:19.021Z","__v":0}
201
```

Contoh output langkah 5 dan 6:

```text
{"statusCode":409,"message":"Duplicate value: data already exists"}
409

{"statusCode":400,"message":"Invalid id format: abc"}
400
```

### Import ke Postman

1. Postman -> **New** -> **Import**.
2. Pilih tab **Raw text**, tempel satu perintah `curl` di atas, klik **Import**.
3. Postman otomatis mengubahnya jadi request (method, URL, header, body JSON).
4. Simpan ke Collection supaya bisa dipakai ulang; `<ID_KATEGORI>` / `<ID_POST>` diganti manual.

---

## 14. Troubleshooting

### `MongoServerError: E11000 duplicate key error ...`

Nama kategori yang dikirim sudah dipakai, dan unique index bekerja. Response HTTP-nya 409.

Kalau justru **tidak** muncul 409 padahal namanya sama, berarti index unique-nya belum ada. Index dibuat
Mongoose saat aplikasi start; kalau collection di-`drop` manual saat aplikasi masih jalan, index ikut hilang.
Solusi: restart `pnpm start:dev`, atau buat manual di `mongosh`:

```js
db.categories.createIndex({ name: 1 }, { unique: true })
```

### `CastError: Cast to ObjectId failed for value "abc"`

Parameter `:id` bukan ObjectId 24 karakter hex. Filter mengubahnya jadi 400. Untuk request body, DTO sudah
mencegahnya lewat `@IsMongoId`.

### `TypeError: Missing parameter name at 1`

Pola wildcard Express 4 (`'*'`) tidak valid di Express 5. Pakai `'{*splat}'` (langkah 10).

### `Cannot find module '.../app.module' imported from ...`

Project ini ESM (`"type": "module"`). Semua import file lokal wajib bersuffix `.js`, termasuk yang
sebenarnya `.ts`: `import { AppModule } from './app.module.js';`.

### `categoryId` tersimpan sebagai string, bukan ObjectId

Gejalanya: `populate()` tidak mengembalikan data kategori, dan pengecekan "kategori masih punya post" selalu
lolos. Penyebabnya `@Prop({ type: mongoose.Types.ObjectId })` — `@nestjs/mongoose` menganggap opsi `type` yang
berupa *function* sebagai class schema, lalu mengubahnya jadi `Mixed`, dan `Mixed` menyimpan nilai apa adanya
(string tetap string). Tulis seperti ini:

```ts
import mongoose from 'mongoose';

@Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true })
categoryId: mongoose.Types.ObjectId;
```

Cek cepat apakah sudah benar:

```bash
node --input-type=module -e "const { PostSchema } = await import('./dist/posts/schemas/post.schema.js'); console.log(PostSchema.path('categoryId').instance)"
# harus keluar: ObjectId     (kalau Mixed, berarti masih salah)
```

### Test e2e gagal di kasus 409 setelah `dropDatabase()`

`dropDatabase()` ikut menghapus index dan Mongoose tidak membuatnya ulang otomatis. Karena itu `beforeAll`
memanggil `createIndexes()` setelah drop:

```ts
const connection = app.get<Connection>(getConnectionToken());
await connection.dropDatabase();
await Promise.all(
  Object.values(connection.models).map((model) => model.createIndexes()),
);
```

### `ECONNREFUSED 127.0.0.1:27017`

MongoDB belum jalan. `brew services start mongodb-community`, atau jalankan
`mongod --dbpath /tmp/blog-mongo --port 27017` di terminal terpisah.
