import { Module } from '@nestjs/common';
import { HealthCheckService } from './health-check.service';
import { HealthCheckController } from './health-check.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { User } from '../entities';
import { DatabaseService } from '../config/database/database.service';

@Module({
  imports: [ScheduleModule.forRoot(), TypeOrmModule.forFeature([User])],
  controllers: [HealthCheckController],
  providers: [HealthCheckService, DatabaseService],
})
export class HealthCheckModule {}
