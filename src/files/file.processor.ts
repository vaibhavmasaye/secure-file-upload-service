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
        this.logger.log(`\n--- Start processing job ID: ${job.id} ---`);
    
        const file = Array.isArray((job as any).files)
          ? (job as any).files[0]
          : (job as any).file;
    
        this.logger.log(`Retrieved file: ${JSON.stringify(file, null, 2)}`);
    
        if (!file || !file.destination) {
          this.logger.error(`File or file.destination is missing for job ${job.id}`);
          continue;
        }
    
        const filePath = file.destination;
        this.logger.log(`File path: ${filePath}`);
    
        this.logger.log(`Updating job ${job.id} to 'processing' status...`);
        await this.jobModel.update(
          { status: 'processing', startedAt: new Date() },
          { where: { id: job.id } }
        );
    
        this.logger.log(`Updating file ${file.id} to 'processing' status...`);
        await this.fileModel.update(
          { status: 'processing' },
          { where: { id: file.id } }
        );
    
        this.logger.log(`Getting file stats for: ${filePath}`);
        const fileStats = await stat(filePath);
        this.logger.log(`File stats: ${JSON.stringify(fileStats)}`);
    
        this.logger.log(`Reading file: ${filePath}`);
        const fileBuffer = await readFile(filePath);
        this.logger.log(`Read file buffer of length: ${fileBuffer.length}`);
    
        const hash = createHash('sha256').update(fileBuffer).digest('hex');
        this.logger.log(`Generated SHA256 hash: ${hash}`);
    
        const extractedData = {
          hash,
          size: fileStats.size,
          extension: extname(filePath).toLowerCase(),
          lastModified: fileStats.mtime.toISOString(),
          created: fileStats.birthtime.toISOString(),
          processedAt: new Date().toISOString(),
          mimeType: this.getMimeType(extname(filePath)),
        };
    
        this.logger.log(`Extracted data: ${JSON.stringify(extractedData, null, 2)}`);
    
        this.logger.log(`Updating file ${file.id} to 'processed' status...`);
        await this.fileModel.update(
          {
            status: 'processed',
            extractedData: JSON.stringify(extractedData),
          },
          { where: { id: file.id } }
        );
    
        this.logger.log(`Updating job ${job.id} to 'completed' status...`);
        await this.jobModel.update(
          { status: 'completed', completedAt: new Date() },
          { where: { id: job.id } }
        );
    
        this.logger.log(`✅ Successfully processed file ${file.id} for job ${job.id}`);
        this.logger.log(`--- Finished processing job ID: ${job.id} ---\n`);
    
      } catch (error) {
        this.logger.error(`❌ Error processing job ${job.id}: ${error.message}`);
    
        await this.fileModel.update(
          { status: 'failed' },
          { where: { id: (job as any).fileId } }
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
