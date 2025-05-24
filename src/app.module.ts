import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import { BullModule } from '@nestjs/bull';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { FilesModule } from './files/files.module';
import { User } from './auth/entities/user.model';
import { File } from './files/entities/file.model';
import { Job } from './files/entities/job.model';
import { HealthModule } from './health/health.module';
import { getDatabaseConfig } from './config/database.config';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60,
        limit: 10,
      },
    ]),

    // Database
    SequelizeModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: getDatabaseConfig,
      inject: [ConfigService],
    }),

    // Queue
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: 'yamabiko.proxy.rlwy.net',
          port: 11440,
          username: 'default',
          password: 'wZHipAGzMBqYunUnTtnMFShNXguJLpVi'
        }
      })
    }),

    // Feature modules
    AuthModule,
    FilesModule,
    HealthModule,
  ],
})
export class AppModule {}