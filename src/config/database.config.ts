import { ConfigService } from '@nestjs/config';
import { SequelizeModuleOptions } from '@nestjs/sequelize';
import { User } from '../auth/entities/user.model';
import { File } from '../files/entities/file.entity';
import { Job } from '../files/entities/job.entity';

export const getDatabaseConfig = async (
  configService: ConfigService,
): Promise<SequelizeModuleOptions> => ({
  dialect: 'postgres',
  host: configService.get('DB_HOST'),
  port: configService.get('DB_PORT'),
  username: configService.get('DB_USERNAME'),
  password: configService.get('DB_PASSWORD'),
  database: configService.get('DB_DATABASE'),
  autoLoadModels: true,
  models: [User, File, Job],
  synchronize: configService.get('DB_SYNCHRONIZE') === 'true',
  logging: configService.get('NODE_ENV') === 'development',
  dialectOptions: {
    ssl: configService.get('DB_SSL') === 'true' ? {
      require: true,
      rejectUnauthorized: false
    } : false
  }
});