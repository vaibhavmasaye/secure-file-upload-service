import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { CreateFileDto } from './dto/create-file.dto';

import { File } from './entities/file.model';
import { Job } from './entities/job.model';
import { InjectQueue } from '@nestjs/bull';
import { User } from '../auth/entities/user.model';

@Injectable()
export class FilesService {
  constructor(
    @InjectModel(File)
    private readonly fileModel: typeof File,
    @InjectModel(Job)
    private readonly jobModel: typeof Job,
    @InjectQueue('file-processing') private fileProcessingQueue: any,
  ) {}
  async create(file: Express.Multer.File, dto: CreateFileDto, userId: number) {
    console.log('[Files Service] File:', file);
    console.log('[Files Service] DTO:', dto);
  
    // Validate file existence
    if (!file?.path) {
      throw new InternalServerErrorException('File path not available');
    }
  
    // Save to DB
    try {
      const savedFile = await this.fileModel.create({
        filename: file.filename,
        originalname: file.originalname,
        path: file.path,
        mimetype: file.mimetype,
        size: file.size,
        userId: userId,
        description: dto.description,
        tags: dto.tags,
      });
  
      return savedFile;
    } catch (err) {
      console.error('[Files Service] DB error:', err);
      throw new InternalServerErrorException('Could not save file to DB');
    }
  }
  
  

  async findOne(id: number, user: User) {
    const file = await this.fileModel.findOne({
      where: { id, userId: user.id },
      include: [{ model: Job }],
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    // Include job status and progress information
    const response = {
      ...file,
      processingStatus: file.job ? file.job.status : 'unknown',
      processingStarted: file.job?.startedAt,
      processingCompleted: file.job?.completedAt,
      error: file.job?.errorMessage,
    };

    return response;
  }

  async findAll(user: User, page = 1, limit = 10) {
    const { rows: files, count: total } = await this.fileModel.findAndCountAll({
      where: { userId: user.id },
      offset: (page - 1) * limit,
      limit,
      order: [['uploadedAt', 'DESC']],
      include: [{ model: Job }],
    });

    return {
      files,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateStatus(fileId: number, status: string, extractedData?: string) {
    const file = await this.fileModel.findOne({
      where: { id: fileId },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    file.status = status;
    if (extractedData) {
      file.extractedData = extractedData;
    }

    await file.save();
    return file;
  }
}