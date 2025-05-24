import { Column, Model, Table, DataType, HasOne } from 'sequelize-typescript';
import { Job } from './job.model';

@Table({
  tableName: 'files',
  timestamps: true,
})
export class File extends Model {
  [x: string]: any;

  @Column
  originalname: string;

  @Column
  filename: string;

  @Column
  mimetype: string;

  @Column
  destination: string;

  @Column
  status: string;

  @Column
  userId: number;

  @Column(DataType.TEXT)
  extractedData: string;

  @Column(DataType.DATE)
  uploadedAt: Date;

  @HasOne(() => Job)
  job: Job;
}