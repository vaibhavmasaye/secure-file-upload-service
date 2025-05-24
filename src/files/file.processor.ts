import { Processor, Process } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Job } from 'bull';
import { createHash } from 'crypto';
import { readFile, stat } from 'fs/promises';
import { extname } from 'path';
import { File } from './entities/file.model';
import { Job as JobModel } from './entities/job.model';

type FileStatus = 'uploaded' | 'processing' | 'processed' | 'failed';
type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';
type MimeTypes = {
  [key: string]: string;
};

@Injectable()
@Processor('file-processing')
export class FileProcessor {
  private readonly logger = new Logger(FileProcessor.name);

  constructor(
    @InjectModel(File)
    private readonly fileModel: typeof File,
    @InjectModel(JobModel)
    private readonly jobModel: typeof JobModel,
  ) {}

  private getMimeType(extension: string): string {
    const mimeTypes: MimeTypes = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.txt': 'text/plain',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.csv': 'text/csv',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
    return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
  }

  @Process('process-file')
  async processFile(job: Job<{ fileId: number; jobId: number; filePath: string }>) {
    const { fileId, jobId, filePath } = job.data;
    this.logger.log(`Processing file ${fileId} with job ${jobId}`);

    try {
      // Update job status to processing
      await this.jobModel.update(
        {
          status: 'processing' as JobStatus,
          startedAt: new Date(),
        },
        { where: { id: jobId } }
      );

      // Update file status
      await this.fileModel.update(
        { status: 'processing' as FileStatus },
        { where: { id: fileId } }
      );

      // Get file stats
      const fileStats = await stat(filePath);
      const fileBuffer = await readFile(filePath);
      
      // Calculate file hash
      const hash = createHash('sha256').update(fileBuffer).digest('hex');

      // Extract comprehensive metadata
      const extractedData = {
        hash,
        size: fileStats.size,
        extension: extname(filePath).toLowerCase(),
        lastModified: fileStats.mtime.toISOString(),
        created: fileStats.birthtime.toISOString(),
        processedAt: new Date().toISOString(),
        mimeType: this.getMimeType(extname(filePath)),
      };

      // Update file with processed data
      await this.fileModel.update(
        {
          status: 'processed' as FileStatus,
          extractedData: JSON.stringify(extractedData),
        },
        { where: { id: fileId } }
      );

      // Update job status to completed
      await this.jobModel.update(
        {
          status: 'completed' as JobStatus,
          completedAt: new Date(),
        },
        { where: { id: jobId } }
      );

      this.logger.log(`Successfully processed file ${fileId}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Error processing file ${fileId}: ${error.message}`);
      
      // Update file and job status to failed
      await this.fileModel.update(
        { status: 'failed' as FileStatus },
        { where: { id: fileId } }
      );
      await this.jobModel.update(
        {
          status: 'failed' as JobStatus,
          errorMessage: error.message,
          completedAt: new Date()
        },
        { where: { id: jobId } }
      );

      throw error;
    }
  }
}