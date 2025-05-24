import { Table, Column, Model, DataType, BelongsTo, HasOne, ForeignKey } from 'sequelize-typescript';
import { User } from '../../auth/entities/user.model';
import { Job } from './job.entity';

@Table({
  tableName: 'files',
  timestamps: true
})
export class File extends Model {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true
  })
  id: number;

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

  @Column({ 
    type: DataType.JSONB,
    allowNull: true,
    defaultValue: null 
  })
  extractedData: Record<string, any>;

  @Column(DataType.DATE)
  uploadedAt: Date;

  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    field: 'userId',
    allowNull: false
  })
  userId: number;

  @BelongsTo(() => User, {
    foreignKey: 'userId',
    onDelete: 'CASCADE'
  })
  user: User;

  @HasOne(() => Job)
  job: Job;
}