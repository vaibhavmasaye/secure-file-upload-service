import { Controller, Post, Get, Param, Query, UseGuards, UseInterceptors, UploadedFile, Body, ParseIntPipe, BadRequestException, Req, InternalServerErrorException } from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { FilesService } from './files.service';
import { CreateFileDto } from './dto/create-file.dto';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../auth/entities/user.model';

@Controller('files')
@UseGuards(AuthGuard('jwt'))
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(FileInterceptor('file'))
  @Post('upload')
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() createFileDto: CreateFileDto,
    @Req() req: Request,
  ) {
    try {
      console.log('[Files Controller] File:', file);
      console.log('[Files Controller] Body:', createFileDto);
  
      if (!file) {
        throw new BadRequestException('No file uploaded');
      }
  
      const userId = (req.user as any).id;
      return await this.filesService.create(file, createFileDto, userId);
    } catch (error) {
      console.error('[Files Controller] Error during upload:', error);
      throw error;
    }
  }
  

  

  @Get(':id')
  async getFile(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: User,
  ) {
    return this.filesService.findOne(id, user);
  }

  @Get()
  async getFiles(
    @GetUser() user: User,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 10,
  ) {
    return this.filesService.findAll(user, page, limit);
  }
}