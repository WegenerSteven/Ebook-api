import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaymentMethod } from '../entities/payment.entity';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePaymentDto {
  orderId: number;

  @ApiProperty({ enum: PaymentMethod, default: PaymentMethod.STRIPE })
  @IsEnum(PaymentMethod)
  @IsOptional()
  method?: PaymentMethod = PaymentMethod.STRIPE;

  @ApiProperty({ description: 'Phone number for M-Pesa', required: false })
  @IsString()
  @IsOptional()
  phoneNumber?: string;
}
