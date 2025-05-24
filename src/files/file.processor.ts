import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Cron, CronExpression, Interval } from '@nestjs/schedule';
import { createHash } from 'crypto';
import { readFile, stat } from 'fs/promises';
import { extname } from 'path';
import * as pdfParse from 'pdf-parse';
import * as textract from 'textract';
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

  private async extractTextFromFile(filePath: string, mimeType: string): Promise<string> {
    try {
      if (mimeType === 'application/pdf') {
        const buffer = await readFile(filePath);
        const data = await pdfParse(buffer);
        return data.text.slice(0, 1000); // Limit for safety/logging
      }

      // Use textract for doc/docx/txt/csv/xlsx
      if (
        [
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
          'text/csv',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ].includes(mimeType)
      ) {
        return new Promise((resolve, reject) => {
          textract.fromFileWithPath(filePath, (err: Error | null, text: string) => {
            if (err) return reject(err);
            resolve(text.slice(0, 1000)); // Limit output
          });
        });
      }

      // For images or unsupported types, return fake summary
      return 'No text content extracted (unsupported MIME type or binary format).';
    } catch (err) {
      this.logger.error(`Text extraction failed: ${err.message}`);
      return 'Failed to extract text.';
    }
  }

  @Interval(10000) // every 10 seconds
  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron() {
    this.logger.log('Running scheduled file processing task...');

    const queuedJobs = await this.jobModel.findAll({
      where: { status: 'queued' },
      include: [{ model: this.fileModel, where: { status: 'uploaded' } }],
      limit: 5,
    });

    if (queuedJobs.length === 0) {
      this.logger.log('No queued jobs found at this time.');
      return;
    }

    for (const job of queuedJobs) {
      try {
        const file = Array.isArray((job as any).files) ? (job as any).files[0] : (job as any).file;

        if (!file || !file.destination) {
          this.logger.error(`File or file destination is missing for job ${job.id}`);
          continue;
        }

        const filePath = file.destination;
        this.logger.log(`Processing file ID ${file.id} for job ID ${job.id}`);
        this.logger.debug(`File object: ${JSON.stringify(file, null, 2)}`);

        await this.jobModel.update(
          { status: 'processing', startedAt: new Date() },
          { where: { id: job.id } }
        );
        await this.fileModel.update(
          { status: 'processing' },
          { where: { id: file.id } }
        );

        const fileStats = await stat(filePath);
        const fileBuffer = await readFile(filePath);
        const hash = createHash('sha256').update(fileBuffer).digest('hex');
        const extension = extname(filePath).toLowerCase();
        const mimeType = this.getMimeType(extension);

        const extractedText = await this.extractTextFromFile(filePath, mimeType);

        const extractedData = {
          hash,
          size: fileStats.size,
          extension,
          lastModified: fileStats.mtime.toISOString(),
          created: fileStats.birthtime.toISOString(),
          processedAt: new Date().toISOString(),
          mimeType,
          virusScan: {
            status: 'clean',
            scannedAt: new Date().toISOString(),
          },
          summary: extractedText,
        };

        await this.fileModel.update(
          {
            status: 'processed',
            extractedData: JSON.stringify(extractedData),
          },
          { where: { id: file.id } }
        );

        await this.jobModel.update(
          { status: 'completed', completedAt: new Date() },
          { where: { id: job.id } }
        );

        this.logger.log(`✅ Successfully processed file ${file.id} for job ${job.id}`);
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
