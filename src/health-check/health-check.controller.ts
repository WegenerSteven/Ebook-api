import { Get } from '@nestjs/common';
import { Controller } from '@nestjs/common';
import { HealthCheckService } from './health-check.service';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../config/database/database.service';
import { Public } from '../auth/decorators/public.decorator';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
@Controller('health-check')
export class HealthCheckController {
  constructor(
    private readonly healthCheckService: HealthCheckService,
    private configService: ConfigService,
    private databaseService: DatabaseService,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  check() {
    return {
      status: 'Ok',
      timeStamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: this.configService.getOrThrow<string>('NODE_ENV'),
      memory: process.memoryUsage(),
    };
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Simple ping endpoint' })
  ping() {
    return {
      message: 'pong',
      timeStamp: new Date().toISOString(),
      serverTime: new Date().toISOString(),
    };
  }

  //check database connection
  private async checkDbConnection() {
    try {
      //simple query to check DB connection
      await this.databaseService.checkConnection();
      return {
        status: 'Connected',
        timeStamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'disconnected',
        error: error instanceof Error ? error.message : 'unknown error',
      };
    }
  }
}
