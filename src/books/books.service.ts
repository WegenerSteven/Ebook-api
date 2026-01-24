import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Book, Category, UserRole } from '../entities';
import { CreateBookDto, UpdateBookDto, QueryBooksDto } from './dto';

@Injectable()
export class BooksService {
  constructor(
    @InjectRepository(Book)
    private booksRepository: Repository<Book>,
    @InjectRepository(Category)
    private categoriesRepository: Repository<Category>,
  ) {}

  async create(createBookDto: CreateBookDto, sellerId: string) {
    const category = await this.categoriesRepository.findOne({
      where: { id: createBookDto.categoryId },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const book = this.booksRepository.create({
      ...createBookDto,
      sellerId,
    });

    return this.booksRepository.save(book);
  }

  async findAll(queryDto: QueryBooksDto) {
    const {
      page = 1,
      limit = 12,
      search,
      categoryId,
      category,
      minPrice,
      maxPrice,
      minRating,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      isFeatured,
      sellerId,
    } = queryDto;

    const queryBuilder = this.booksRepository
      .createQueryBuilder('book')
      .leftJoinAndSelect('book.category', 'category')
      .leftJoinAndSelect('book.seller', 'seller')
      .where('book.isActive = :isActive', { isActive: true });

    if (search) {
      queryBuilder.andWhere(
        '(book.title ILIKE :search OR book.author ILIKE :search OR book.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (categoryId) {
      queryBuilder.andWhere('book.categoryId = :categoryId', { categoryId });
    }

    if (category) {
      queryBuilder.andWhere('category.slug = :categorySlug', {
        categorySlug: category,
      });
    }

    if (minPrice !== undefined) {
      queryBuilder.andWhere('book.price >= :minPrice', { minPrice });
    }

    if (maxPrice !== undefined) {
      queryBuilder.andWhere('book.price <= :maxPrice', { maxPrice });
    }

    if (minRating !== undefined) {
      queryBuilder.andWhere('book.rating >= :minRating', { minRating });
    }

    if (isFeatured !== undefined) {
      queryBuilder.andWhere('book.isFeatured = :isFeatured', { isFeatured });
    }

    if (sellerId) {
      queryBuilder.andWhere('book.sellerId = :sellerId', { sellerId });
    }

    queryBuilder
      .orderBy(`book.${sortBy}`, sortOrder)
      .skip((page - 1) * limit)
      .take(limit);

    const [books, total] = await queryBuilder.getManyAndCount();

    return {
      data: books.map((book) => ({
        ...book,
        seller: book.seller
          ? { id: book.seller.id, fullname: book.seller.fullname }
          : null,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const book = await this.booksRepository.findOne({
      where: { id, isActive: true },
      relations: ['category', 'seller', 'reviews', 'reviews.user'],
    });

    if (!book) {
      throw new NotFoundException('Book not found');
    }

    // Increment view count
    await this.booksRepository.increment({ id }, 'viewCount', 1);

    return {
      ...book,
      seller: book.seller
        ? { id: book.seller.id, fullname: book.seller.fullname }
        : null,
    };
  }

  async update(
    id: number,
    updateBookDto: UpdateBookDto,
    userId: string,
    userRole: UserRole,
  ) {
    const book = await this.booksRepository.findOne({
      where: { id },
    });

    if (!book) {
      throw new NotFoundException('Book not found');
    }

    // Only the seller who owns the book or admin can update
    if (book.sellerId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only update your own books');
    }

    if (updateBookDto.categoryId) {
      const category = await this.categoriesRepository.findOne({
        where: { id: updateBookDto.categoryId },
      });

      if (!category) {
        throw new NotFoundException('Category not found');
      }
    }

    await this.booksRepository.update(id, updateBookDto);
    return this.findOne(id);
  }

  async remove(id: number, userId: string, userRole: UserRole) {
    const book = await this.booksRepository.findOne({
      where: { id },
    });

    if (!book) {
      throw new NotFoundException('Book not found');
    }

    // Only the seller who owns the book or admin can delete
    if (book.sellerId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only delete your own books');
    }

    // Soft delete by setting isActive to false
    await this.booksRepository.update(id, { isActive: false });
    return { message: 'Book deleted successfully' };
  }

  async getFeaturedBooks(limit = 8) {
    return this.booksRepository.find({
      where: { isActive: true, isFeatured: true },
      relations: ['category'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getTopRatedBooks(limit = 8) {
    return this.booksRepository.find({
      where: { isActive: true },
      relations: ['category'],
      order: { rating: 'DESC' },
      take: limit,
    });
  }

  async getBestSellingBooks(limit = 8) {
    return this.booksRepository.find({
      where: { isActive: true },
      relations: ['category'],
      order: { salesCount: 'DESC' },
      take: limit,
    });
  }

  async getSellerBooks(sellerId: string, queryDto: QueryBooksDto) {
    return this.findAll({ ...queryDto, sellerId });
  }

  async getSellerStats(sellerId: string) {
    const books = await this.booksRepository.find({
      where: { sellerId },
    });

    const totalProducts = books.length;
    const totalSales = books.reduce((sum, book) => sum + book.salesCount, 0);
    const totalViews = books.reduce((sum, book) => sum + book.viewCount, 0);
    const totalRevenue = books.reduce(
      (sum, book) => sum + book.salesCount * Number(book.price),
      0,
    );

    return {
      totalProducts,
      totalSales,
      totalViews,
      totalRevenue,
    };
  }
}
