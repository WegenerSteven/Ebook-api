import { Module } from '@nestjs/common';
import { SellerController } from './seller.controller';
import { BooksModule } from '../books/books.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [BooksModule, OrdersModule],
  controllers: [SellerController],
})
export class SellerModule {}
