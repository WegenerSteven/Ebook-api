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
  UnauthorizedException,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { AddToCartDto, UpdateCartItemDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser } from '../auth/decorators';
import { User } from 'src/entities';

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(@CurrentUser('userId') userId: string) {
    return this.cartService.getCart(userId);
  }

  @Get('count')
  getCartCount(@CurrentUser('userId') userId: string) {
    return this.cartService.getCartCount(userId);
  }

  @Post()
  addToCart(@CurrentUser() user: User, @Body() addToCartDto: AddToCartDto) {
    //extract useid from the correct propoerty
    const userId = user?.userId;

    if (!userId) {
      throw new UnauthorizedException('User id not found in token');
    }
    return this.cartService.addToCart(userId, addToCartDto);
  }

  @Patch(':id')
  updateCartItem(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseIntPipe) itemId: number,
    @Body() updateDto: UpdateCartItemDto,
  ) {
    return this.cartService.updateCartItem(userId, itemId, updateDto);
  }

  @Delete(':id')
  removeFromCart(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseIntPipe) itemId: number,
  ) {
    return this.cartService.removeFromCart(userId, itemId);
  }

  @Delete()
  clearCart(@CurrentUser('userId') userId: string) {
    return this.cartService.clearCart(userId);
  }
}
