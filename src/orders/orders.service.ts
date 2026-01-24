import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  Order,
  OrderItem,
  Book,
  OrderStatus,
  UserRole,
  CartItem,
} from '../entities';
import { CreateOrderDto, UpdateOrderDto } from './dto';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemsRepository: Repository<OrderItem>,
    @InjectRepository(Book)
    private booksRepository: Repository<Book>,
    @InjectRepository(CartItem)
    private cartItemsRepository: Repository<CartItem>,
    private dataSource: DataSource,
  ) {}

  async create(createOrderDto: CreateOrderDto, userId: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { items, paymentIntentId } = createOrderDto;

      // Validate and get book details
      const orderItems: Partial<OrderItem>[] = [];
      let subtotal = 0;

      for (const item of items) {
        const book = await this.booksRepository.findOne({
          where: { id: item.bookId, isActive: true },
        });

        if (!book) {
          throw new NotFoundException(`Book with ID ${item.bookId} not found`);
        }

        const itemTotal = Number(book.price) * item.quantity;
        subtotal += itemTotal;

        orderItems.push({
          bookId: item.bookId,
          quantity: item.quantity,
          price: book.price,
          total: itemTotal,
        });
      }

      const tax = subtotal * 0.08; // 8% tax
      const total = subtotal + tax;

      // Generate order number
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // Create order
      const order = queryRunner.manager.create(Order, {
        orderNumber,
        userId,
        subtotal,
        tax,
        total,
        paymentIntentId,
        status: OrderStatus.PENDING,
      });

      const savedOrder = await queryRunner.manager.save(order);

      // Create order items
      for (const item of orderItems) {
        const orderItem = queryRunner.manager.create(OrderItem, {
          ...item,
          orderId: savedOrder.id,
        });
        await queryRunner.manager.save(orderItem);

        // Update book sales count
        await queryRunner.manager.increment(
          Book,
          { id: item.bookId },
          'salesCount',
          item.quantity!,
        );
      }

      // Clear user's cart
      await queryRunner.manager.delete(CartItem, { userId });

      await queryRunner.commitTransaction();

      return this.findOne(savedOrder.id, userId, UserRole.USER);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(page = 1, limit = 10, userId?: string, userRole?: UserRole) {
    const queryBuilder = this.ordersRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.book', 'book')
      .leftJoinAndSelect('order.user', 'user');

    // If not admin, only show user's own orders
    if (userRole !== UserRole.ADMIN && userId) {
      queryBuilder.where('order.userId = :userId', { userId });
    }

    queryBuilder
      .orderBy('order.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [orders, total] = await queryBuilder.getManyAndCount();

    return {
      data: orders.map((order) => ({
        ...order,
        user: order.user
          ? {
              id: order.user.id,
              fullname: order.user.fullname,
              email: order.user.email,
            }
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

  async findOne(id: number, userId: string, userRole: UserRole) {
    const order = await this.ordersRepository.findOne({
      where: { id },
      relations: ['items', 'items.book', 'user'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Only allow access to own orders unless admin
    if (order.userId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Access denied');
    }

    return {
      ...order,
      user: order.user
        ? { id: order.user.id, fullname: order.user.fullname, email: order.user.email }
        : null,
    };
  }

  async update(
    id: number,
    updateOrderDto: UpdateOrderDto,
    userId: string,
    userRole: UserRole,
  ) {
    const order = await this.ordersRepository.findOne({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Only admin can update order status
    if (userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can update order status');
    }

    await this.ordersRepository.update(id, updateOrderDto);
    return this.findOne(id, userId, userRole);
  }

  async getUserOrders(userId: string, page = 1, limit = 10) {
    return this.findAll(page, limit, userId, UserRole.USER);
  }

  async getSellerOrders(sellerId: string, page = 1, limit = 10) {
    const queryBuilder = this.ordersRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.book', 'book')
      .leftJoinAndSelect('order.user', 'user')
      .where('book.sellerId = :sellerId', { sellerId })
      .orderBy('order.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [orders, total] = await queryBuilder.getManyAndCount();

    return {
      data: orders.map((order) => ({
        ...order,
        user: order.user
          ? {
              id: order.user.id,
              fullname: order.user.fullname,
              email: order.user.email,
            }
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

  async getOrderStats(userRole: UserRole, userId?: string) {
    const queryBuilder = this.ordersRepository.createQueryBuilder('order');

    if (userRole === UserRole.SELLER && userId) {
      queryBuilder
        .leftJoin('order.items', 'items')
        .leftJoin('items.book', 'book')
        .where('book.sellerId = :sellerId', { sellerId: userId });
    }

    const totalOrders = await queryBuilder.getCount();

    const pendingOrders = await this.ordersRepository.count({
      where: { status: OrderStatus.PENDING },
    });

    const completedOrders = await this.ordersRepository.count({
      where: { status: OrderStatus.COMPLETED },
    });

    const revenueResult = await this.ordersRepository
      .createQueryBuilder('order')
      .select('SUM(order.total)', 'total')
      .where('order.status = :status', { status: OrderStatus.COMPLETED })
      .getRawOne<{ total: string | null }>();

    return {
      totalOrders,
      pendingOrders,
      completedOrders,
      totalRevenue: revenueResult?.total ? Number(revenueResult.total) : 0,
    };
  }

  async getRecentOrders(limit = 5) {
    return this.ordersRepository.find({
      relations: ['items', 'items.book', 'user'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
