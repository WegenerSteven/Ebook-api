import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async checkConnection(): Promise<boolean> {
    try {
      await this.dataSource.query(' SELECT 1');
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Database connection faild: ${message}`);
    }
  }

  getConnectionStatus(): {
    isConnected: boolean;
    database: string;
    driver: string;
  } {
    return {
      isConnected: this.dataSource.isInitialized,
      database: this.dataSource.options.database as string,
      driver: this.dataSource.options.type,
    };
  }
}
