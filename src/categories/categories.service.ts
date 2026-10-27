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
