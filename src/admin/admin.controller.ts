import { Controller, Get, UseGuards } from '@nestjs/common';
import { BooksService } from '../books/books.service';
import { OrdersService } from '../orders/orders.service';
import { UsersService } from '../users/users.service';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { Roles } from '../auth/decorators';
import { UserRole } from '../entities';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(
    private readonly booksService: BooksService,
    private readonly ordersService: OrdersService,
    private readonly usersService: UsersService,
  ) {}

  @Get('dashboard')
  async getDashboard() {
    const userStats = await this.usersService.getStats();
    const orderStats = await this.ordersService.getOrderStats(UserRole.ADMIN);
    const recentOrders = await this.ordersService.getRecentOrders(5);
    const availableBooks = await this.booksService.findAll({
      limit: 50,
    });

    return {
      users: userStats,
      orders: orderStats,
      recentOrders,
      availableBooks,
    };
  }

  @Get('stats')
  async getStats() {
    const userStats = await this.usersService.getStats();
    const orderStats = await this.ordersService.getOrderStats(UserRole.ADMIN);

    return {
      ...userStats,
      ...orderStats,
    };
  }
}
