// create-file.dto.ts
import { IsString, IsOptional, IsArray } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateFileDto {
  @IsOptional()
  @IsString()
  title?: string;
  
  @IsString()
  description: string;

  @IsArray()
  @Transform(({ value }) => {
    try {
      return JSON.parse(value);
    } catch {
      return [];
    }
  })
  tags: string[];
}
