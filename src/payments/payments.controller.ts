import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser } from '../auth/decorators';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { User } from 'src/entities';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-intent')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiBody({ type: CreatePaymentDto })
  @ApiOperation({ summary: 'Create a Stripe PaymentIntent' })
  @ApiResponse({
    status: 201,
    description: 'Payment intent created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request or order already paid',
  })
  @ApiResponse({ status: 404, description: 'Order or user not found' })
  async createPaymentIntent(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.paymentsService.createPaymentIntent(userId, dto);
  }

  @Post('confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm a payment after successful checkout' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        paymentIntentId: {
          type: 'string',
          example: 'pi_3Lf9q2J2ZvKYlo2C0l7X1Q2E',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Payment confirmed successfully' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async confirmPayment(@Body('paymentIntentId') paymentIntendId: string) {
    if (!paymentIntendId) {
      throw new BadRequestException('paymentIntentId is required');
    }
    return this.paymentsService.confirmPayment(paymentIntendId);
  }

  @Get('user')
  @ApiOperation({ summary: 'Get all payments for the authenticated user' })
  @ApiResponse({ status: 200, description: 'List of user payments' })
  async getPaymentsByUser(@CurrentUser() user: User) {
    return this.paymentsService.getPaymentsByUser(user.userId);
  }

  @Get('order/:orderId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment details for a specific order' })
  @ApiResponse({ status: 200, description: 'Payment details for the order' })
  @ApiResponse({ status: 404, description: 'Payment not found for this order' })
  async getPaymentByOrder(
    @CurrentUser('userId') userId: string,
    @Param('orderId') orderId: number,
  ) {
    return this.paymentsService.getPaymentByOrderId(orderId, userId);
  }
}
