import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Book, User, Category, Order, CartItem, Review } from '../../entities';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const shouldSync =
          configService.getOrThrow<string>('DB_SYNCHRONIZE') === 'true';
        return {
          type: 'postgres',
          host: configService.getOrThrow<string>('DB_HOST'),
          port: configService.getOrThrow<number>('DB_PORT'),
          username: configService.getOrThrow<string>('DB_USERNAME'),
          password: configService.getOrThrow<string>('DB_PASSWORD'),
          database: configService.getOrThrow<string>('DB_NAME'),
          entities: [User, Book, Category, Order, CartItem, Review],
          synchronize: shouldSync,
          logging: configService.getOrThrow<boolean>('DB_LOGGING'),
          migrations: [__dirname + '/migrations/**/*{.ts, .js}'],
          autoLoadEntities: true,
          keepConnectionAlive: true,
        };
      },
      inject: [ConfigService],
    }),
  ],

  controllers: [],
  providers: [],
})
export class DatabaseModule {}
