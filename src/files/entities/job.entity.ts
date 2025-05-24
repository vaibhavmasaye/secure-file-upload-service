import { Table, Column, Model, DataType, BelongsTo, ForeignKey } from 'sequelize-typescript';
import { File } from './file.entity';

@Table({
  tableName: 'jobs',
})
export class Job extends Model {
  @Column({
    type: DataType.STRING,
    primaryKey: true
  })
  jobId: string;

  @Column
  status: string;

  @Column(DataType.TEXT)
  errorMessage: string;



  @ForeignKey(() => File)
  @Column(DataType.INTEGER)
  fileId: number;

  @BelongsTo(() => File)
  file: File;

  @Column(DataType.DATE)
  createdAt: Date;

  @Column({ type: DataType.DATE, allowNull: true })
  startedAt: Date;

  @Column({ type: DataType.DATE, allowNull: true })
  completedAt: Date;
}