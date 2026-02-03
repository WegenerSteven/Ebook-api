import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { BooksService } from '../books/books.service';
import { OrdersService } from '../orders/orders.service';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { Roles, CurrentUser } from '../auth/decorators';
import { UserRole } from '../entities';
import { CreateBookDto, UpdateBookDto, QueryBooksDto } from '../books/dto';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Seller')
@ApiBearerAuth()
@Controller('seller')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SELLER, UserRole.ADMIN)
export class SellerController {
  constructor(
    private readonly booksService: BooksService,
    private readonly ordersService: OrdersService,
  ) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get seller dashboard data' })
  async getDashboard(@CurrentUser('id') sellerId: string) {
    const bookStats = await this.booksService.getSellerStats(sellerId);
    const orderStats = await this.ordersService.getOrderStats(
      UserRole.SELLER,
      sellerId,
    );

    // Get recent orders for this seller
    const recentOrdersData = await this.ordersService.getSellerOrders(
      sellerId,
      1,
      5,
    );

    const recentSales = recentOrdersData.data.map((order) => ({
      id: order.orderId,
      product: order.items[0]?.book?.title || 'Unknown Product',
      buyer: order.user?.fullname || 'Unknown Buyer',
      amount: order.total.toString(),
      date: order.createdAt,
    }));

    return {
      stats: bookStats.stats,
      totalBooks: bookStats.totalBooks,
      totalSales: bookStats.totalSalesCount,
      totalViews: bookStats.totalViews,
      conversionRate: bookStats.conversionRate,
      ...orderStats,
      recentSales,
    };
  }

  @Get('books')
  @ApiOperation({ summary: 'Get all books for the seller' })
  async getSellerBooks(
    @CurrentUser('id') sellerId: string,
    @Query() queryDto: QueryBooksDto,
  ) {
    return this.booksService.getSellerBooks(sellerId, queryDto);
  }

  @Get('books/:id')
  @ApiOperation({ summary: 'Get a specific book by ID' })
  async getBook(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') sellerId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    const book = await this.booksService.findOne(id);
    // Ensure seller can only view their own books (unless admin)
    if (book.seller?.id !== sellerId && role !== UserRole.ADMIN) {
      return {
        error: 'Unauthorized',
        message: 'You can only view your own books',
      };
    }
    return book;
  }

  @Post('books')
  @ApiOperation({ summary: 'Create a new book' })
  async createBook(
    @Body() createBookDto: CreateBookDto,
    @CurrentUser('id') sellerId: string,
  ) {
    return this.booksService.create(createBookDto, sellerId);
  }

  @Put('books/:id')
  @ApiOperation({ summary: 'Update a book' })
  async updateBook(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBookDto: UpdateBookDto,
    @CurrentUser('id') sellerId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.booksService.update(id, updateBookDto, sellerId, role);
  }

  @Delete('books/:id')
  @ApiOperation({ summary: 'Delete a book (soft delete)' })
  async deleteBook(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') sellerId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.booksService.remove(id, sellerId, role);
  }

  @Get('orders')
  @ApiOperation({ summary: 'Get orders containing seller products' })
  async getSellerOrders(
    @CurrentUser('id') sellerId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.ordersService.getSellerOrders(sellerId, page, limit);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get seller statistics' })
  async getSellerStats(@CurrentUser('id') sellerId: string) {
    const stats = await this.booksService.getSellerStats(sellerId);

    return {
      stats: stats.stats,
      totalBooks: stats.totalBooks,
      totalSalesCount: stats.totalSalesCount,
      totalViews: stats.totalViews,
      conversionRate: stats.conversionRate,
    };
  }
}
