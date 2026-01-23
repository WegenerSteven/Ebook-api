import { IsEnum, IsOptional } from 'class-validator';
import { OrderStatus } from '../../entities';

export class UpdateOrderDto {
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;
}
