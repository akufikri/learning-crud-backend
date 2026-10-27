import { PartialType } from '@nestjs/mapped-types';
import { CreateCategoryDto } from './create-category.dto.js';

// PartialType membuat semua field CreateCategoryDto jadi optional,
// jadi PATCH boleh kirim sebagian field saja.
export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}
