import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { AddToCartDto, UpdateCartItemDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser } from '../auth/decorators';

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(@CurrentUser('id') userId: string) {
    return this.cartService.getCart(userId);
  }

  @Get('count')
  getCartCount(@CurrentUser('id') userId: string) {
    return this.cartService.getCartCount(userId);
  }

  @Post()
  addToCart(
    @CurrentUser('id') userId: string,
    @Body() addToCartDto: AddToCartDto,
  ) {
    return this.cartService.addToCart(userId, addToCartDto);
  }

  @Patch(':id')
  updateCartItem(
    @CurrentUser('id') userId: string,
    @Param('id', ParseIntPipe) itemId: number,
    @Body() updateDto: UpdateCartItemDto,
  ) {
    return this.cartService.updateCartItem(userId, itemId, updateDto);
  }

  @Delete(':id')
  removeFromCart(
    @CurrentUser('id') userId: string,
    @Param('id', ParseIntPipe) itemId: number,
  ) {
    return this.cartService.removeFromCart(userId, itemId);
  }

  @Delete()
  clearCart(@CurrentUser('id') userId: string) {
    return this.cartService.clearCart(userId);
  }
}
