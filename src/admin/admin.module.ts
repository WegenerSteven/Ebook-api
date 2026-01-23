import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { BooksModule } from '../books/books.module';
import { OrdersModule } from '../orders/orders.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [BooksModule, OrdersModule, UsersModule],
  controllers: [AdminController],
})
export class AdminModule {}
