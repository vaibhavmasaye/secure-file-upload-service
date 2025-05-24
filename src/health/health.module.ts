import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { HealthController } from './health.controller';
import { File } from '../files/entities/file.model';

@Module({
  imports: [SequelizeModule.forFeature([File])],
  controllers: [HealthController],
})
export class HealthModule {}