import { Controller, Get } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { File } from '../files/entities/file.model';

@Controller('health')
export class HealthController {
  constructor(
    @InjectModel(File)
    private readonly fileModel: typeof File,
  ) {}

  @Get()
  async check() {
    try {
      const sequelize = this.fileModel.sequelize;
      if (!sequelize) {
        return { status: 'error', message: 'Database connection not initialized' };
      }
      await sequelize.authenticate();
      return { status: 'ok', message: 'Database connection is healthy' };
    } catch (error) {
      return { status: 'error', message: 'Database connection failed' };
    }
  }
}