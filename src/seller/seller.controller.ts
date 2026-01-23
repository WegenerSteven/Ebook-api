import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { BooksService } from '../books/books.service';
import { OrdersService } from '../orders/orders.service';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { Roles, CurrentUser } from '../auth/decorators';
import { UserRole } from '../entities';
import { QueryBooksDto } from '../books/dto';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';

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
  async getDashboard(@CurrentUser('id') sellerId: string) {
    const stats = await this.booksService.getSellerStats(sellerId);
    const orderStats = await this.ordersService.getOrderStats(
      UserRole.SELLER,
      sellerId,
    );

    return {
      ...stats,
      ...orderStats,
    };
  }

  @Public()
  @Get('books')
  async getSellerBooks(
    @CurrentUser('id') sellerId: string,
    @Query() queryDto: QueryBooksDto,
  ) {
    return this.booksService.getSellerBooks(sellerId, queryDto);
  }

  @Get('orders')
  async getSellerOrders(
    @CurrentUser('id') sellerId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.ordersService.getSellerOrders(sellerId, page, limit);
  }

  @Get('stats')
  async getSellerStats(@CurrentUser('id') sellerId: string) {
    return this.booksService.getSellerStats(sellerId);
  }
}
