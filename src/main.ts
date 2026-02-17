import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import * as bodyParser from 'body-parser';
import { RequestHandler } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true, // Enable raw body for webhook signature verification
  });
  const configService = app.get(ConfigService);

  //use helmet
  app.use(helmet());

  //configure body-parser
  const rawBodyBufferLimit = configService.getOrThrow<string>(
    'RAW_BODY_BUFFER_LIMIT',
    '10mb',
  );
  const jsonBodyLimit = configService.getOrThrow<string>(
    'JSON_BODY_LIMIT',
    '10mb',
  );

  //apply raw body parser only to webhook endpoint

  // eslint-disable @typescript-eslint/no-unsafe-call
  app.use(
    '/webhooks/stripe',
    bodyParser.raw({
      type: 'application/json',
      limit: rawBodyBufferLimit,
    }) as RequestHandler,
  );

  //apply JSON body parser to all other routes
  // eslint-disable @typescript-eslint/no-unsafe-call
  app.use(bodyParser.json({ limit: jsonBodyLimit }) as RequestHandler);

  // Enable CORS
  app.enableCors({
    origin: [
      'http://localhost:5173',
      'http://localhost:5174',
      'https://etuitor.netlify.app',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // API prefix
  app.setGlobalPrefix('api');

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  //swagger api
  const config = new DocumentBuilder()
    .setTitle('Ebook Store API')
    .setDescription('API documentation for the Ebook Store application')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = configService.getOrThrow<number>('PORT') || 3000;
  await app.listen(port);

  console.log(
    `🚀 Application is running on: http://localhost:${port}/api/docs`,
  );
}
bootstrap();
