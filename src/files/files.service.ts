import { Injectable, NotFoundException } from '@nestjs/common';
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

  async create(createFileDto: CreateFileDto, file: Express.Multer.File, user: User) {
    // Create file record
    const fileEntity = await this.fileModel.create({
      originalname: file.originalname,
      filename: file.filename,
      mimetype: file.mimetype,
      destination: file.destination,
      status: 'uploaded',
      userId: user.id,
    });

    // Create job entry
    const jobEntity = await this.jobModel.create({
      fileId: fileEntity.id,
      jobId: `${fileEntity.id}-${Date.now()}`,
      status: 'pending',
    });

    // Add to processing queue
    await this.fileProcessingQueue.add(
      'process-file',
      {
        fileId: fileEntity.id,
        jobId: jobEntity.id,
        filePath: file.path,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    );

    return fileEntity;
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