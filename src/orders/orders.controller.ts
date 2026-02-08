import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto, UpdateOrderDto } from './dto';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { Roles, CurrentUser } from '../auth/decorators';
import { UserRole } from '../entities';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(
    @Body() createOrderDto: CreateOrderDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.ordersService.create(createOrderDto, userId);
  }

  @Get()
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @CurrentUser('userId') userId?: string,
    @CurrentUser('role') userRole?: UserRole,
  ) {
    return this.ordersService.findAll(page, limit, userId, userRole);
  }

  @Get('my-orders')
  getUserOrders(
    @CurrentUser('userId') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.ordersService.getUserOrders(userId, page, limit);
  }

  @Get('seller-orders')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  getSellerOrders(
    @CurrentUser('userId') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.ordersService.getSellerOrders(userId, page, limit);
  }

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  getOrderStats(
    @CurrentUser('role') userRole: UserRole,
    @CurrentUser('userId') userId: string,
  ) {
    return this.ordersService.getOrderStats(userRole, userId);
  }

  @Get('recent')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  getRecentOrders(@Query('limit') limit?: number) {
    return this.ordersService.getRecentOrders(limit);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') userRole: UserRole,
  ) {
    return this.ordersService.findOne(id, userId, userRole);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateOrderDto: UpdateOrderDto,
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') userRole: UserRole,
  ) {
    return this.ordersService.update(id, updateOrderDto, userId, userRole);
  }
}
