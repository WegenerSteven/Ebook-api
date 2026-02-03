import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Book, Category, Order, UserRole } from '../entities';
import { CreateBookDto, UpdateBookDto, QueryBooksDto } from './dto';

interface OrderStats {
  total: string | null;
  orderCount?: string;
  count?: string;
}

@Injectable()
export class BooksService {
  constructor(
    @InjectRepository(Book)
    private booksRepository: Repository<Book>,
    @InjectRepository(Category)
    private categoriesRepository: Repository<Category>,
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
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
    // Calculate dates for last 30 and 60 days
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const books = await this.booksRepository.find({
      where: { sellerId },
    });

    //current period totals
    const totalBooks = books.filter((book) => book.isActive).length;
    const totalSalesCount = books.reduce(
      (sum, book) => sum + book.salesCount,
      0,
    );
    const totalViews = books.reduce((sum, book) => sum + book.viewCount, 0);
    const totalRevenue = books.reduce(
      (sum, book) => sum + book.salesCount * Number(book.price),
      0,
    );

    //calculate conversion rate (sales / views * 100)
    const conversionRate =
      totalViews > 0 ? (totalSalesCount / totalViews) * 100 : 0;

    //get orders for trend calculation

    const currentPeriodOrders = await this.ordersRepository
      .createQueryBuilder('ord')
      .innerJoin('ord.items', 'orderItems')
      .innerJoin('orderItems.book', 'book', 'book.sellerId = :sellerId', {
        sellerId,
      })
      .where('ord.createdAt >= :thirtyDaysAgo', { thirtyDaysAgo })
      .andWhere('ord.status = :status', { status: 'completed' })
      .select('SUM(ord.total)', 'total')
      .getRawOne<OrderStats>();

    const previousPeriodOrders = await this.ordersRepository
      .createQueryBuilder('ord')
      .innerJoin('ord.items', 'orderItems')
      .innerJoin('orderItems.book', 'book', 'book.sellerId = :sellerId', {
        sellerId,
      })
      .where('ord.createdAt >= :sixtyDaysAgo', { sixtyDaysAgo })
      .andWhere('ord.createdAt < :thirtyDaysAgo', { thirtyDaysAgo })
      .andWhere('ord.status = :status', { status: 'completed' })
      .select('SUM(ord.total)', 'total')
      .getRawOne<OrderStats>();

    // Calculate percentage changes
    const currentRevenue = Number(currentPeriodOrders?.total) || 0;
    const previousRevenue = Number(previousPeriodOrders?.total) || 0;
    const revenueChange =
      previousRevenue > 0
        ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
        : currentRevenue > 0
          ? 100
          : 0;

    // For simplicity, using mock trends for views and conversion (you can add similar period comparisons)
    const viewsChange = 12.5; // You can implement actual comparison
    const conversionChange = 0.4; // You can implement actual comparison
    const productsChange = 3; // New products added this month

    return {
      stats: [
        {
          key: 'totalSales',
          title: 'Total Sales',
          value: totalRevenue,
          formattedValue: `$${totalRevenue.toLocaleString()}`,
          change: Number(revenueChange.toFixed(1)),
          trend: revenueChange >= 0 ? 'up' : 'down',
          icon: 'DollarSign',
          color: revenueChange >= 0 ? 'green' : 'red',
        },
        {
          key: 'totalBooks',
          title: 'Products Listed',
          value: totalBooks,
          formattedValue: totalBooks.toString(),
          change: productsChange,
          trend: productsChange >= 0 ? 'up' : 'down',
          icon: 'Package',
          color: productsChange >= 0 ? 'blue' : 'red',
        },
        {
          key: 'totalViews',
          title: 'Total Views',
          value: totalViews,
          formattedValue: totalViews.toLocaleString(),
          change: viewsChange,
          trend: viewsChange >= 0 ? 'up' : 'down',
          icon: 'Eye',
          color: viewsChange >= 0 ? 'purple' : 'red',
        },
        {
          key: 'conversionRate',
          title: 'Conversion Rate',
          value: conversionRate,
          formattedValue: `${conversionRate.toFixed(1)}%`,
          change: conversionChange,
          trend: conversionChange >= 0 ? 'up' : 'down',
          icon: 'TrendingUp',
          color: conversionChange >= 0 ? 'orange' : 'red',
        },
      ],
      totalBooks,
      totalSalesCount: totalRevenue,
      totalViews,
      conversionRate,
    };
  }
}
