import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { BullModule } from '@nestjs/bull';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { FileProcessor } from './file.processor';
import { File } from './entities/file.model';
import { Job } from './entities/job.model';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Module({
  imports: [
    SequelizeModule.forFeature([File, Job]),
    MulterModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        storage: diskStorage({
          destination: './uploads',
          filename: (req, file, cb) => {
            const randomName = Array(32)
              .fill(null)
              .map(() => Math.round(Math.random() * 16).toString(16))
              .join('');
            return cb(null, `${randomName}${extname(file.originalname)}`);
          },
        }),
        limits: {
          fileSize: configService.get('MAX_FILE_SIZE'),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: 'file-processing',
    }),
  ],
  controllers: [FilesController],
  providers: [FilesService, FileProcessor],
})
export class FilesModule {}