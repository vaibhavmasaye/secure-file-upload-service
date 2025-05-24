import { Controller, Post, Get, Param, Query, UseGuards, UseInterceptors, UploadedFile, Body, ParseIntPipe } from '@nestjs/common';
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

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() createFileDto: CreateFileDto,
    @GetUser() user: User,
  ) {
    console.log('[Files Controller] Starting file upload process');
    console.log('[Files Controller] File details:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      destination: file.destination,
      path: file.path
    });

    const result = await this.filesService.create(createFileDto, file, user);
    console.log('[Files Controller] File upload successful:', result);
    return {
      success: true,
      message: 'File uploaded successfully',
      data: result
    };
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