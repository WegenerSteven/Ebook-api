import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  Min,
  IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBookDto {
  @IsString()
  @ApiProperty({ description: 'Title of the book' })
  title: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ description: 'Subtitle of the book', required: false })
  subtitle?: string;

  @IsString()
  @ApiProperty({ description: 'Author of the book' })
  author: string;

  @IsString()
  @ApiProperty({ description: 'Description of the book' })
  description: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @ApiProperty({ description: 'Price of the book' })
  price: number;

  @IsUrl()
  @ApiProperty({ description: 'Cover URL of the book' })
  coverUrl: string;

  @IsOptional()
  @IsUrl()
  @ApiProperty({ description: 'File URL of the book', required: false })
  fileUrl?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @ApiProperty({ description: 'Number of pages', required: false })
  pages?: number;

  @IsOptional()
  @IsString()
  @ApiProperty({ description: 'Language of the book', required: false })
  language?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ description: 'Publisher of the book', required: false })
  publisher?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ description: 'Published date of the book', required: false })
  publishedDate?: string;

  @Type(() => Number)
  @IsNumber()
  @ApiProperty({ description: 'Category ID of the book' })
  categoryId: number;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({
    description: 'Indicates if the book is featured',
    required: false,
  })
  isFeatured?: boolean;
}
