import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CartItem, Book } from '../entities';
import { AddToCartDto, UpdateCartItemDto } from './dto';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(CartItem)
    private cartItemsRepository: Repository<CartItem>,
    @InjectRepository(Book)
    private booksRepository: Repository<Book>,
  ) {}

  async getCart(userId: string) {
    const items = await this.cartItemsRepository.find({
      where: { userId },
      relations: ['book', 'book.category'],
      order: { createdAt: 'DESC' },
    });

    const subtotal = items.reduce(
      (sum, item) => sum + Number(item.book.price) * item.quantity,
      0,
    );

    const tax = subtotal * 0.08;
    const total = subtotal + tax;

    return {
      items: items.map((item) => ({
        id: item.id,
        bookId: item.bookId,
        title: item.book.title,
        author: item.book.author,
        price: item.book.price,
        coverUrl: item.book.coverUrl,
        category: item.book.category?.name,
        quantity: item.quantity,
        total: Number(item.book.price) * item.quantity,
      })),
      summary: {
        itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
        subtotal,
        tax,
        total,
      },
    };
  }

  async addToCart(userId: string, addToCartDto: AddToCartDto) {
    const { bookId, quantity } = addToCartDto;

    // Check if book exists
    const book = await this.booksRepository.findOne({
      where: { id: bookId, isActive: true },
    });

    if (!book) {
      throw new NotFoundException('Book not found');
    }

    // Check if item already in cart
    let cartItem = await this.cartItemsRepository.findOne({
      where: {
        userId: userId,
        bookId: addToCartDto.bookId,
      },
    });

    if (cartItem) {
      // Update quantity
      cartItem.quantity += quantity;
      await this.cartItemsRepository.save(cartItem);
    } else {
      // Create new cart item
      cartItem = this.cartItemsRepository.create({
        userId: userId,
        bookId: addToCartDto.bookId,
        quantity,
      });
      await this.cartItemsRepository.save(cartItem);
    }

    return this.getCart(userId);
  }

  async updateCartItem(
    userId: string,
    itemId: number,
    updateDto: UpdateCartItemDto,
  ) {
    const cartItem = await this.cartItemsRepository.findOne({
      where: { id: itemId, userId },
    });

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    cartItem.quantity = updateDto.quantity;
    await this.cartItemsRepository.save(cartItem);

    return this.getCart(userId);
  }

  async removeFromCart(userId: string, itemId: number) {
    const cartItem = await this.cartItemsRepository.findOne({
      where: { id: itemId, userId },
    });

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    await this.cartItemsRepository.remove(cartItem);
    return this.getCart(userId);
  }

  async clearCart(userId: string) {
    await this.cartItemsRepository.delete({ userId });
    return { message: 'Cart cleared successfully' };
  }

  async getCartCount(userId: string) {
    const items = await this.cartItemsRepository.find({
      where: { userId },
    });

    return {
      count: items.reduce((sum, item) => sum + item.quantity, 0),
    };
  }
}
