import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

// HydratedDocument = dokumen Mongoose yang sudah "hidup": punya _id, save(), dll.
export type CategoryDocument = HydratedDocument<Category>;

// timestamps: true -> Mongoose otomatis mengisi createdAt dan updatedAt
@Schema({ timestamps: true })
export class Category {
  // unique: true membuat index unik di MongoDB, jadi nama kategori tidak bisa dobel
  @Prop({ required: true, unique: true, trim: true, maxlength: 60 })
  name: string;

  // tanda "?" artinya field ini boleh tidak dikirim saat create/update
  @Prop({ trim: true, maxlength: 300 })
  description?: string;
}

// SchemaFactory membaca decorator @Prop di atas lalu mengubahnya jadi Schema Mongoose
export const CategorySchema = SchemaFactory.createForClass(Category);
