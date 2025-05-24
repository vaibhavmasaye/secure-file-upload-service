import { Column, Model, Table, BelongsTo, ForeignKey, DataType } from 'sequelize-typescript';
import { File } from './file.model';

@Table({
  tableName: 'jobs',
})
export class Job extends Model {
  @Column
  jobId: string;

  @Column
  status: string;

  @Column(DataType.TEXT)
  errorMessage: string;

  @Column(DataType.DATE)
  startedAt: Date;

  @Column(DataType.DATE)
  completedAt: Date;

  @ForeignKey(() => File)
  @Column
  fileId: number;

  @BelongsTo(() => File)
  file: File;
}