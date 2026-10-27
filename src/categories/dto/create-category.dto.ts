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
