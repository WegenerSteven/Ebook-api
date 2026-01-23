import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category, Book } from '../entities';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private categoriesRepository: Repository<Category>,
    @InjectRepository(Book)
    private booksRepository: Repository<Book>,
  ) {}

  async create(createCategoryDto: CreateCategoryDto) {
    // Check if slug already exists
    const existingCategory = await this.categoriesRepository.findOne({
      where: [
        { slug: createCategoryDto.slug },
        { name: createCategoryDto.name },
      ],
    });

    if (existingCategory) {
      throw new ConflictException(
        'Category with this name or slug already exists',
      );
    }

    const category = this.categoriesRepository.create(createCategoryDto);
    return this.categoriesRepository.save(category);
  }

  async findAll() {
    const categories = await this.categoriesRepository.find({
      order: { name: 'ASC' },
    });

    // Get book count for each category
    const categoriesWithCount = await Promise.all(
      categories.map(async (category) => {
        const bookCount = await this.booksRepository.count({
          where: { categoryId: category.id, isActive: true },
        });
        return { ...category, bookCount };
      }),
    );

    return categoriesWithCount;
  }

  async findOne(id: number) {
    const category = await this.categoriesRepository.findOne({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const bookCount = await this.booksRepository.count({
      where: { categoryId: id, isActive: true },
    });

    return { ...category, bookCount };
  }

  async findBySlug(slug: string) {
    const category = await this.categoriesRepository.findOne({
      where: { slug },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const bookCount = await this.booksRepository.count({
      where: { categoryId: category.id, isActive: true },
    });

    return { ...category, bookCount };
  }

  async update(id: number, updateCategoryDto: UpdateCategoryDto) {
    const category = await this.categoriesRepository.findOne({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    if (updateCategoryDto.slug && updateCategoryDto.slug !== category.slug) {
      const existingCategory = await this.categoriesRepository.findOne({
        where: { slug: updateCategoryDto.slug },
      });

      if (existingCategory) {
        throw new ConflictException('Category with this slug already exists');
      }
    }

    await this.categoriesRepository.update(id, updateCategoryDto);
    return this.findOne(id);
  }

  async remove(id: number) {
    const category = await this.categoriesRepository.findOne({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // Check if category has books
    const bookCount = await this.booksRepository.count({
      where: { categoryId: id },
    });

    if (bookCount > 0) {
      throw new ConflictException(
        'Cannot delete category with existing books. Please reassign or delete the books first.',
      );
    }

    await this.categoriesRepository.remove(category);
    return { message: 'Category deleted successfully' };
  }

  async getPopularCategories(
    limit = 6,
  ): Promise<(Category & { bookCount: number })[]> {
    const categories = await this.categoriesRepository
      .createQueryBuilder('category')
      .leftJoin('category.books', 'book', 'book.isActive = true')
      .select('category.*')
      .addSelect('COUNT(book.id)', 'bookCount')
      .groupBy('category.id')
      .orderBy('bookCount', 'DESC')
      .limit(limit)
      .getRawMany<Category & { bookCount: number }>();

    return categories;
  }
}
