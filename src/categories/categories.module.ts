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
