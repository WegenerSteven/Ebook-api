import {
  BadRequestException,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  RawBodyRequest,
  Post,
  Headers,
  Req,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly configService: ConfigService,
  ) {}

  @Post('stripe')
  @HttpCode(HttpStatus.OK)
  async handleStipewebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    //validate signature presence
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    //validate raw body presence
    if (!req.rawBody) throw new BadRequestException('Missing raw body');

    try {
      this.logger.debug(
        `Received stripe webhook with signature: ${signature.substring(0, 20)}...`,
      );

      const result = await this.paymentsService.handleStripeWebhook(
        req.rawBody,
        signature,
      );

      this.logger.debug('Stripe webhook processed successfully');
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Stripe webhook error: ${message}`, error);

      if (error instanceof BadRequestException) {
        throw error;
      }

      return {
        received: true,
        error: 'Internal server error',
      };
    }
  }
}
