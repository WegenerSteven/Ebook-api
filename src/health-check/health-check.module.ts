import { Module } from '@nestjs/common';
import { HealthCheckService } from './health-check.service';
import { HealthCheckController } from './health-check.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { User } from '../entities';
import { DatabaseService } from '../config/database/database.service';
import { keepAliveService } from './keep-alive/keep-alive.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([User]),
    HttpModule,
  ],
  controllers: [HealthCheckController],
  providers: [HealthCheckService, DatabaseService, keepAliveService],
})
export class HealthCheckModule {}
