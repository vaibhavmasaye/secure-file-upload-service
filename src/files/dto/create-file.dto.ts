import { IsString, IsOptional } from 'class-validator';

export class CreateFileDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;
}