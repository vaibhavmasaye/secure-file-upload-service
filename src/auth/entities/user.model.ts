import { Column, Model, Table, HasMany, CreatedAt, PrimaryKey, AutoIncrement, BeforeCreate, DataType } from 'sequelize-typescript';
import { File } from '../../files/entities/file.model'; // Adjust the path as needed

import * as bcrypt from 'bcryptjs';

interface UserCreationAttributes {
  username: string;
  email: string;
  password: string;
}

@Table({
  tableName: 'users',
  timestamps: true,
})
export class User extends Model<User, UserCreationAttributes> {
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
    primaryKey: true
  })
  id: number;

  @Column({ unique: true })
  username: string;

  @Column({ unique: true })
  email: string;

  @Column
  password: string;

  @CreatedAt
  createdAt: Date;

  @HasMany(() => File, {
    foreignKey: 'userId',
    as: 'files'
  })
  files: File[];

  @BeforeCreate
  static async hashPassword(instance: User) {
    const salt = await bcrypt.genSalt();
    instance.password = await bcrypt.hash(instance.password, salt);
  }
}