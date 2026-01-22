import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { BooksService } from './books.service';
import { CreateBookDto, UpdateBookDto, QueryBooksDto } from './dto';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { Roles, CurrentUser } from '../auth/decorators';
import { UserRole } from '../entities';

@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  create(
    @Body() createBookDto: CreateBookDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.booksService.create(createBookDto, userId);
  }

  @Get()
  findAll(@Query() queryDto: QueryBooksDto) {
    return this.booksService.findAll(queryDto);
  }

  @Get('featured')
  getFeaturedBooks(@Query('limit') limit?: number) {
    return this.booksService.getFeaturedBooks(limit);
  }

  @Get('top-rated')
  getTopRatedBooks(@Query('limit') limit?: number) {
    return this.booksService.getTopRatedBooks(limit);
  }

  @Get('best-selling')
  getBestSellingBooks(@Query('limit') limit?: number) {
    return this.booksService.getBestSellingBooks(limit);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.booksService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBookDto: UpdateBookDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: UserRole,
  ) {
    return this.booksService.update(id, updateBookDto, userId, userRole);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER, UserRole.ADMIN)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: UserRole,
  ) {
    return this.booksService.remove(id, userId, userRole);
  }
}
