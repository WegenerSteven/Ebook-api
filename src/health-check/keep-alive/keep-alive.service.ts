import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../../entities';
import { HttpService } from '@nestjs/axios';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { AxiosResponse } from 'axios';
import { firstValueFrom } from 'rxjs';
import { CronExpression, Cron } from '@nestjs/schedule';

@Injectable()
export class keepAliveService implements OnModuleInit {
  private readonly logger = new Logger(keepAliveService.name);
  private readonly baseUrl: string;

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl =
      this.configService.get<string>('BACKEND_URL') ||
      this.configService.get<string>('APP_URL') ||
      'http://localhost:3000';
  }

  onModuleInit() {
    //start self-ping when the module initializes
    if (this.configService.get<string>('NODE_ENV') === 'production') {
      this.logger.log('Starting KeepAlive service for production');
      this.startSelfPing();
    }
  }

  //self-ping to keep render instance alive
  private startSelfPing() {
    //ping every 5 mins (Render spins down after 15 mins of inactivity)
    const PING_INTERVAL = 15 * 60 * 1000;

    setInterval(() => {
      void this.pingOwnerServer();
    }, PING_INTERVAL);

    //initial ping
    setTimeout(() => void this.pingOwnerServer(), 5000);
  }

  private async pingOwnerServer() {
    try {
      const healthUrl = `${this.baseUrl}/api/health-check`;
      const response: AxiosResponse<string> = await firstValueFrom(
        this.httpService.get<string>(healthUrl),
      );
      this.logger.debug('Self-ping successful - Render instance kept alive');
      return response;
    } catch (error) {
      this.logger.warn('Self-ping failed (might be starting up)', error);
    }
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async keepDatabaseAlive() {
    try {
      await this.userRepo.count();
      this.logger.log('Db connection is live');
    } catch (error) {
      this.logger.error('Db connection is down', error);
    }
  }

  //log server status every hour
  @Cron(CronExpression.EVERY_30_MINUTES)
  logServerStatus() {
    this.logger.log(`Server is running. uptime: ${process.uptime()}s`);
  }
}
