import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFiles,
  Body,
  Request,
  UseGuards,
  Get,
  Param,
  Delete,
  Res,
  Query,
  ForbiddenException,
  HttpStatus,
  Put,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { BadRequestException } from '@nestjs/common';

import { ProjectService } from './project.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { multerStorage, fileFilter } from './file-upload.config';
import { GcsService } from './gcs.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { AuthGuard } from '@nestjs/passport';

function isValidPostmanCollection(content: string): boolean {
  try {
    const json = JSON.parse(content);
    return json?.info?.schema?.includes('v2.1');
  } catch {
    return false;
  }
}

@Controller('project')
export class ProjectController {
  constructor(
    private readonly projectService: ProjectService,
    private readonly gcsService: GcsService,
  ) {}

  /**
   * API: Tạo một project mới cho user
   * - Cho phép upload nhiều file (Postman .json, K6 .js)
   * - Lưu file lên Google Cloud Storage
   * - Yêu cầu user đã đăng nhập (bảo vệ bằng JWT)
   */
  @UseGuards(JwtAuthGuard)
  @Post()
  @UseInterceptors(
    AnyFilesInterceptor({
      storage: multerStorage, // Sử dụng memory storage
      fileFilter,
    }),
  )
  async createProject(
    @Body() createProjectDto: CreateProjectDto,
    @UploadedFiles() files: Express.Multer.File[],
    @Request() req,
  ) {
    const userId = req.user.userId;

    // Xử lý và upload files lên GCS
    for (const file of files) {
      if (file.originalname.endsWith('.json')) {
        // Kiểm tra định dạng Postman v2.1
        const content = file.buffer.toString('utf8');
        if (!isValidPostmanCollection(content)) {
          throw new BadRequestException(
            'File Postman phải đúng định dạng chuẩn v2.1',
          );
        }

        // Tạo tên file unique
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const fileName = `${uniqueSuffix}_${file.originalname}`;

        // Upload lên GCS
        const gcsPath = await this.gcsService.uploadFile(
          file,
          fileName,
          'postman',
        );

        createProjectDto.postmanFilePath = gcsPath;
        createProjectDto.originalPostmanFileName = file.originalname;
      } else if (file.originalname.endsWith('.js')) {
        // Tạo tên file unique
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const fileName = `${uniqueSuffix}_${file.originalname}`;

        // Upload lên GCS
        const gcsPath = await this.gcsService.uploadFile(file, fileName, 'k6');

        createProjectDto.k6ScriptFilePath = gcsPath;
        createProjectDto.originalK6ScriptFileName = file.originalname;
      }
    }

    // Validate JSON strings
    try {
      if (createProjectDto.headers) JSON.parse(createProjectDto.headers);
      if (createProjectDto.body) JSON.parse(createProjectDto.body);
    } catch {
      throw new BadRequestException(
        'Headers hoặc Body không phải định dạng JSON hợp lệ',
      );
    }

    // Gọi service để tạo project trong database
    const createdProject = await this.projectService.create(
      createProjectDto,
      userId,
    );
    return {
      message: 'Project created successfully',
      data: createdProject,
    };
  }

  /**
   * API: Lấy danh sách các project của user hiện tại
   */
  @UseGuards(AuthGuard('jwt'))
  @Get()
  getProjects(@Request() req) {
    const userId = req.user.userId;
    return this.projectService.getProjectsByUser(userId);
  }

  /**
   * API: Xóa project theo ID
   */
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteProject(@Param('id') id: string, @Request() req) {
    const userId = req.user.userId;
    return this.projectService.deleteProject(+id, userId);
  }

  /**
   * API: Đọc nội dung file từ Google Cloud Storage
   */
  @UseGuards(JwtAuthGuard)
  @Get('view-file')
  async viewFile(@Query('path') filePath: string, @Res() res: Response) {
    if (!filePath) {
      return res.status(HttpStatus.BAD_REQUEST).send('Missing file path');
    }

    // Kiểm tra path có phải từ GCS không
    if (!filePath.startsWith('gs://')) {
      throw new ForbiddenException('Invalid file path');
    }

    try {
      const content = await this.gcsService.readFile(filePath);
      return res.status(HttpStatus.OK).send(content);
    } catch (err) {
      return res.status(HttpStatus.NOT_FOUND).send('File not found');
    }
  }

  /**
   * API: Cập nhật thông tin project
   */
  @UseGuards(JwtAuthGuard)
  @Put(':id')
  @UseInterceptors(
    AnyFilesInterceptor({
      storage: multerStorage,
      fileFilter,
    }),
  )
  async updateProject(
    @Param('id') id: string,
    @Body() data: Partial<CreateProjectDto>,
    @UploadedFiles() files: Express.Multer.File[] = [],
    @Request() req,
  ) {
    const userId = req.user.userId;

    // Xử lý file mới (nếu có)
    if (files && Array.isArray(files)) {
      for (const file of files) {
        if (file.originalname.endsWith('.json')) {
          const content = file.buffer.toString('utf8');
          if (!isValidPostmanCollection(content)) {
            throw new BadRequestException(
              'File Postman phải đúng định dạng chuẩn v2.1',
            );
          }

          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const fileName = `${uniqueSuffix}_${file.originalname}`;

          const gcsPath = await this.gcsService.uploadFile(
            file,
            fileName,
            'postman',
          );

          data.postmanFilePath = gcsPath;
          data.originalPostmanFileName = file.originalname;
        } else if (file.originalname.endsWith('.js')) {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const fileName = `${uniqueSuffix}_${file.originalname}`;

          const gcsPath = await this.gcsService.uploadFile(file, fileName, 'k6');

          data.k6ScriptFilePath = gcsPath;
          data.originalK6ScriptFileName = file.originalname;
        }
      }
    }

    return this.projectService.updateProject(+id, userId, data);
  }
}