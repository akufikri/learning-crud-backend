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
