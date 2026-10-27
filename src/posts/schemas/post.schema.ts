import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type PostDocument = HydratedDocument<Post>;

@Schema({ timestamps: true })
export class Post {
  @Prop({ required: true, trim: true, maxlength: 150 })
  title: string;

  @Prop({ required: true })
  content: string;

  // ini "foreign key" ke collection categories.
  // ref: 'Category' harus sama dengan name di forFeature({ name: Category.name })
  // index: true supaya pencarian post berdasarkan kategori tetap cepat
  //
  // PENTING: tulis type-nya sebagai mongoose.Schema.Types.ObjectId, JANGAN
  // mongoose.Types.ObjectId. @nestjs/mongoose mengubah opsi type yang berupa
  // function menjadi Mixed, dan Mixed menyimpan id sebagai string biasa.
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
    index: true,
  })
  categoryId: mongoose.Types.ObjectId;

  @Prop({ default: false })
  isPublished: boolean;
}

export const PostSchema = SchemaFactory.createForClass(Post);

