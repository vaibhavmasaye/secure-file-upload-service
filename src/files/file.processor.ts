import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Cron, CronExpression, Interval } from '@nestjs/schedule';
import { createHash } from 'crypto';
import { readFile, stat } from 'fs/promises';
import { extname } from 'path';
import { File } from './entities/file.model';
import { Job as JobModel } from './entities/job.model';

@Injectable()
export class FileProcessor {
  private readonly logger = new Logger(FileProcessor.name);

  constructor(
    @InjectModel(File)
    private readonly fileModel: typeof File,
    @InjectModel(JobModel)
    private readonly jobModel: typeof JobModel,
  ) {}

  private getMimeType(extension: string): string {
    const mimeTypes = {
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
    return mimeTypes[extension.toLowerCase() as keyof typeof mimeTypes] || 'application/octet-stream';
  }

  // Run every minute (you can change to your desired cron schedule)
  @Interval(10000) // runs every 10 seconds
  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron() {
    this.logger.log('Running scheduled file processing task...');

    // Query jobs with queued status and files uploaded (example logic)
    const queuedJobs = await this.jobModel.findAll({
      where: { status: 'queued' },
      include: [{ model: this.fileModel, where: { status: 'uploaded' } }],
      limit: 5, // process max 5 per run for example
    });

    if (queuedJobs.length === 0) {
      this.logger.log('No queued jobs found at this time.');
      return;
    }

    for (const job of queuedJobs) {
      try {
        const file = job.file as File;  // Correct capitalization here
        if (!file || !file.path) {
          this.logger.error(`File or file path is missing for job ${job.id}`);
          continue; // Skip this job to avoid crash
        }
        const filePath = file.path;
    
        this.logger.log(`Processing file ID ${file.id} for job ID ${job.id}`);
    
        // Update job and file status to processing
        await this.jobModel.update(
          { status: 'processing', startedAt: new Date() },
          { where: { id: job.id } }
        );
        await this.fileModel.update(
          { status: 'processing' },
          { where: { id: file.id } }
        );
    
        // Process file
        const fileStats = await stat(filePath);
        const fileBuffer = await readFile(filePath);
        const hash = createHash('sha256').update(fileBuffer).digest('hex');
        const extractedData = {
          hash,
          size: fileStats.size,
          extension: extname(filePath).toLowerCase(),
          lastModified: fileStats.mtime.toISOString(),
          created: fileStats.birthtime.toISOString(),
          processedAt: new Date().toISOString(),
          mimeType: this.getMimeType(extname(filePath)),
        };
    
        // Update file with processed data and mark as processed
        await this.fileModel.update(
          {
            status: 'processed',
            extractedData: JSON.stringify(extractedData),
          },
          { where: { id: file.id } }
        );
    
        // Update job to completed
        await this.jobModel.update(
          { status: 'completed', completedAt: new Date() },
          { where: { id: job.id } }
        );
    
        this.logger.log(`Successfully processed file ${file.id} for job ${job.id}`);
      } catch (error) {
        this.logger.error(`Error processing job ${job.id}: ${error.message}`);
    
        await this.fileModel.update(
          { status: 'failed' },
          { where: { id: job.fileId } }
        );
        await this.jobModel.update(
          {
            status: 'failed',
            errorMessage: error.message,
            completedAt: new Date(),
          },
          { where: { id: job.id } }
        );
      }
    }
    
  }
}
