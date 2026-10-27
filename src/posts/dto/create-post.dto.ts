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
