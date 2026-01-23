import { IsNumber, Min } from 'class-validator';

export class AddToCartDto {
  @IsNumber()
  bookId: number;

  @IsNumber()
  @Min(1)
  quantity: number = 1;
}
