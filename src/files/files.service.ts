import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { InjectModel } from '@nestjs/sequelize';
import { CreateFileDto } from './dto/create-file.dto';
import { join } from 'path';

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
  
    if (!file || !file.destination) {
      throw new InternalServerErrorException('File destination not available');
    }
  
    const fullFilePath = join(file.destination, file.filename);
  
    try {
      // Step 1: Save File Record
      const savedFile = await this.fileModel.create({
        filename: file.filename,
        originalname: file.originalname,
        mimetype: file.mimetype,
        destination: fullFilePath,
        status: 'uploaded',
        userId,
        extractedData: null,
        uploadedAt: new Date(),
      });
  
      // Step 2: Create Job Record
      const jobRecord = await this.jobModel.create({
        jobId: uuidv4(),
        fileId: savedFile.id,
        status: 'queued',
        startedAt: new Date(),
      });
  
      // Prepare response first
      const response = {
        ...savedFile.toJSON(),
        jobId: jobRecord.jobId,
        uploadStatus: 'uploaded',
      };
  
      // Add job to queue asyncronously after response
      this.fileProcessingQueue.add('extract-file-data', {
        fileId: savedFile.id,
        filePath: fullFilePath,
      })
        .catch(async (error: any) => {
          console.error('[Queue Error] Failed to add job:', error);
          await this.jobModel.update({
            status: 'failed',
            errorMessage: 'Failed to add job to queue',
            completedAt: new Date()
          }, { where: { id: jobRecord.id } });
        });

      return response;
  
    } catch (err) {
      console.error('[Files Service] Error saving file or job:', err);
      throw new InternalServerErrorException('Could not save file and job to DB');
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
  
    const fileData = file.toJSON() as any;
  
    const response = {
      ...fileData,
      processingStatus: fileData.job ? fileData.job.status : 'unknown',
      processingStarted: fileData.job?.startedAt,
      processingCompleted: fileData.job?.completedAt,
      error: fileData.job?.errorMessage,
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