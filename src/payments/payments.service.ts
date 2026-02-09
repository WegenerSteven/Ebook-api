import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from '../entities/order.entity';
import { Payment, PaymentMethod, PaymentStatus, User } from '../entities';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  private stripe: Stripe;
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Payment)
    private paymentRepo: Repository<Payment>,
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
    @InjectRepository(User) private userRepo: Repository<User>,
    private configService: ConfigService,
  ) {
    this.stripe = new Stripe(
      this.configService.getOrThrow<string>('STRIPE_SECRET_KEY'),
      { apiVersion: '2026-01-28.clover' },
    );
  }

  private mapStripeStatus(stripeStatus: string): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      requires_payment_method: PaymentStatus.PENDING,
      requires_confirmation: PaymentStatus.PENDING,
      requires_action: PaymentStatus.PENDING,
      processing: PaymentStatus.PROCESSING,
      succeeded: PaymentStatus.SUCCEEDED,
      canceled: PaymentStatus.CANCELLED,
    };
    return statusMap[stripeStatus] || PaymentStatus.FAILED;
  }
  private async retrievePaymentIntentWithDetails(
    paymentIntentId: string,
  ): Promise<Stripe.PaymentIntent> {
    return await this.stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ['latest_charge'],
    });
  }

  // Method to create a payment intent for an order
  async createPaymentIntent(userId: string, dto: CreatePaymentDto) {
    const order = await this.orderRepo.findOne({
      where: { orderId: dto.orderId, userId },
      relations: ['user'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== OrderStatus.PENDING)
      throw new BadRequestException('Order is not in pending status');

    //fetch user
    const user = await this.userRepo.findOne({
      where: { userId },
    });

    if (!user) throw new NotFoundException('User not found');

    //create or get stripe customer
    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await this.stripe.customers.create({
        email: user.email,
        name: user.fullname,
        metadata: {
          userId: user.userId,
        },
      });

      stripeCustomerId = customer.id;
    }

    //update user with stripe customer ID
    user.stripeCustomerId = stripeCustomerId;
    await this.userRepo.save(user);

    //check if payment already exists for this order
    const existingPayment = await this.paymentRepo.findOne({
      where: { orderId: order.orderId, status: PaymentStatus.SUCCEEDED },
    });

    if (existingPayment)
      throw new BadRequestException('Order has already been paid');

    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(Number(order.total) * 100),
        currency: 'usd',
        customer: stripeCustomerId,
        metadata: {
          orderId: order.orderId.toString(),
          userId: userId,
        },
        automatic_payment_methods: {
          enabled: true,
        },
        description: `Payment for order #${order.orderId}`,
      });

      //create payment record
      const payment = this.paymentRepo.create({
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        status: PaymentStatus.PENDING,
        method: PaymentMethod.STRIPE,
        stripeCustomerId,
        userId: userId,
        orderId: order.orderId,
        metadata: {
          clientSecret: paymentIntent.client_secret,
          stripe_payment_intent_id: paymentIntent.id,
          stripe_cutomer_id: stripeCustomerId,
        },
      });

      await this.paymentRepo.save(payment);

      // update order with payment intent ID
      await this.orderRepo.update(order.orderId, {
        paymentIntentId: paymentIntent.id,
        paymentMethod: PaymentMethod.STRIPE,
      });

      return {
        clientSecret: paymentIntent.client_secret,
        paymentId: payment.paymentId,
        amount: payment.amount,
        currency: payment.currency,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new InternalServerErrorException(
        `Failed to create payment: ${message}`,
      );
    }
  }

  async handleStripeWebhook(payload: Buffer, signature: string) {
    const webhookSecret = this.configService.getOrThrow<string>(
      'STRIPE_WEBHOOK_SECRET',
    );

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(
        `Webhook signature verification failed: ${message}`,
      );
    }

    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentSuccess(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await this.handlePaymentFailure(event.data.object);
        break;
      case 'charge.refunded':
        await this.handleRefund(event.data.object);
        break;
    }

    return { received: true };
  }

  //confirm payment success
  async confirmPayment(paymentIntentId: string): Promise<Payment> {
    const payment = await this.paymentRepo.findOne({
      where: { paymentIntentId },
      relations: ['order'],
    });

    if (!payment) throw new NotFoundException('payment not found');

    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(
        paymentIntentId,
        {
          expand: ['latest_charge'],
        },
      );

      payment.status = this.mapStripeStatus(paymentIntent.status);

      //access receipt_url from latest_charge
      payment.receiptUrl =
        typeof paymentIntent.latest_charge === 'object'
          ? paymentIntent.latest_charge?.receipt_url || undefined
          : undefined;

      if (paymentIntent.last_payment_error) {
        payment.failureReason = paymentIntent.last_payment_error.message;
      }

      //update order status if payment succeeded
      if (payment.status === PaymentStatus.SUCCEEDED && payment.order) {
        payment.order.status = OrderStatus.COMPLETED;
        await this.orderRepo.save(payment.order);
      }

      await this.paymentRepo.save(payment);

      return payment;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      throw new InternalServerErrorException(
        `Failed to confirm payment: ${message}`,
      );
    }
  }

  private async handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
    try {
      const expandedPaymentIntent = await this.retrievePaymentIntentWithDetails(
        paymentIntent.id,
      );

      const payment = await this.paymentRepo.findOne({
        where: { paymentIntentId: expandedPaymentIntent.id },
        relations: ['order'],
      });

      if (payment) {
        payment.status = PaymentStatus.SUCCEEDED;
        payment.receiptUrl =
          typeof expandedPaymentIntent.latest_charge === 'object' &&
          expandedPaymentIntent.latest_charge !== null
            ? expandedPaymentIntent.latest_charge?.receipt_url || undefined
            : undefined;

        if (expandedPaymentIntent.last_payment_error) {
          payment.failureReason =
            expandedPaymentIntent.last_payment_error.message;
        }

        await this.paymentRepo.save(payment);

        // Update order status - check if order exists
        if (payment.order) {
          await this.orderRepo.update(payment.orderId, {
            status: OrderStatus.COMPLETED,
          });
        }
      } else {
        this.logger.warn(
          `Payment not found for successful payment intent: ${paymentIntent.id}`,
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error handling payment success: ${message}`, error);
    }
  }

  private async handlePaymentFailure(paymentIntent: Stripe.PaymentIntent) {
    try {
      //get expanded payment intent
      const expandedPaymentIntent = await this.retrievePaymentIntentWithDetails(
        paymentIntent.id,
      );

      const payment = await this.paymentRepo.findOne({
        where: { paymentIntentId: expandedPaymentIntent.id },
        relations: ['order'],
      });

      if (payment) {
        payment.status = PaymentStatus.FAILED;
        payment.failureReason =
          expandedPaymentIntent.last_payment_error?.message || 'Payment failed';

        //get receipt URL if available
        if (expandedPaymentIntent.latest_charge) {
          payment.receiptUrl =
            typeof expandedPaymentIntent.latest_charge === 'object'
              ? expandedPaymentIntent.latest_charge?.receipt_url || undefined
              : undefined;
        }

        await this.paymentRepo.save(payment);

        //update order to failed status
        if (payment.order && payment.order.status === OrderStatus.PENDING) {
          await this.orderRepo.update(payment.orderId, {
            status: OrderStatus.FAILED,
          });
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error handling payment failure: ${message}`, error);
    }
  }

  private async handleRefund(charge: Stripe.Charge) {
    try {
      const payment = await this.paymentRepo.findOne({
        where: { paymentIntentId: charge.payment_intent as string },
      });

      if (payment) {
        payment.status = PaymentStatus.REFUNDED;

        // Get refund reason from the first refund in the charge's refunds list
        const refundReason =
          charge.refunds?.data?.[0]?.reason || 'customer_request';

        //Store refund details in metadata
        payment.metadata = {
          ...payment.metadata,
          refundId: charge.id,
          refundAmount: charge.amount_refunded / 100,
          refundReason,
          refundedAt: new Date().toISOString(),
        };

        await this.paymentRepo.save(payment);

        //update order status
        if (payment.order) {
          await this.orderRepo.update(payment.orderId, {
            status: OrderStatus.REFUNDED,
          });
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error handling refund: ${message}`, error);
    }
  }

  async getPaymentsByUser(userId: string) {
    return this.paymentRepo.find({
      where: { userId },
      relations: ['order'],
      order: { createdAt: 'DESC' },
    });
  }

  async getPaymentByOrderId(orderId: number, userId: string) {
    return await this.paymentRepo.findOne({
      where: { orderId, userId },
    });
  }
}
