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
import { diskStorage } from 'multer';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { BadRequestException } from '@nestjs/common';

import { ProjectService } from './project.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { multerStorage, fileFilter } from './file-upload.config';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { AuthGuard } from '@nestjs/passport';

function isValidPostmanCollection(filePath: string): boolean {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const json = JSON.parse(raw);
    return json?.info?.schema?.includes('v2.1');
  } catch {
    return false;
  }
}

@Controller('project')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  /**
   * API: Tạo một project mới cho user
   * - Cho phép upload nhiều file (Postman .json, K6 .js)
   * - Lưu đường dẫn file tương ứng vào DTO để ghi vào database
   * - Yêu cầu user đã đăng nhập (bảo vệ bằng JWT)
   */
  @UseGuards(JwtAuthGuard)
  @Post()
  @UseInterceptors(
    AnyFilesInterceptor({
      storage: multerStorage,
      fileFilter,
    }),
  )
  async createProject(
    @Body() createProjectDto: CreateProjectDto,
    @UploadedFiles() files: Express.Multer.File[],
    @Request() req,
  ) {
    const userId = req.user.userId;

    // Gán đường dẫn file upload vào DTO
    for (const file of files) {
      if (file.originalname.endsWith('.json')) {
        // Kiểm tra định dạng Postman v2.1
        if (!isValidPostmanCollection(file.path)) {
          throw new BadRequestException(
            'File Postman phải đúng định dạng chuẩn v2.1',
          );
        }

        createProjectDto.postmanFilePath = file.path;
        createProjectDto.originalPostmanFileName = file.originalname;
      } else if (file.originalname.endsWith('.js')) {
        createProjectDto.k6ScriptFilePath = file.path;
        createProjectDto.originalK6ScriptFileName = file.originalname;
      }
    }

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
   * - Trả về danh sách project mà user đã tạo
   * - Bảo vệ bằng JWT để chỉ truy cập khi đã đăng nhập
   */
  @UseGuards(AuthGuard('jwt'))
  @Get()
  getProjects(@Request() req) {
    const userId = req.user.userId;
    return this.projectService.getProjectsByUser(userId);
  }

  /**
   * API: Xóa project theo ID (chỉ khi project thuộc về user hiện tại)
   * - Kiểm tra quyền sở hữu trước khi xóa
   */
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteProject(@Param('id') id: string, @Request() req) {
    const userId = req.user.userId;
    return this.projectService.deleteProject(+id, userId);
  }

  /**
   * API: Đọc nội dung file đã upload trong project (dùng cho Postman/K6)
   * - Đảm bảo chỉ được truy cập file trong thư mục `uploads`
   * - Tránh lộ file hệ thống bên ngoài
   * - Trả về nội dung file dạng text
   */
  @UseGuards(JwtAuthGuard)
  @Get('view-file')
  async viewFile(@Query('path') filePath: string, @Res() res: Response) {
    if (!filePath) {
      return res.status(HttpStatus.BAD_REQUEST).send('Missing file path');
    }

    // Xác định thư mục gốc chứa các file upload
    const uploadsDir = path.resolve('./uploads');

    // Xử lý path tuyệt đối một cách an toàn
    const absPath = path.resolve(
      uploadsDir,
      path.relative('uploads', filePath),
    );

    // Ngăn chặn truy cập ra ngoài thư mục uploads
    if (!absPath.startsWith(uploadsDir)) {
      throw new ForbiddenException('Invalid file path');
    }

    // Đọc và trả về nội dung file
    try {
      const content = fs.readFileSync(absPath, 'utf8');
      return res.status(HttpStatus.OK).send(content);
    } catch (err) {
      return res.status(HttpStatus.NOT_FOUND).send('File not found');
    }
  }

  /**
   * API: Cập nhật thông tin project
   * - Chỉ cho phép cập nhật nếu project thuộc về user hiện tại
   * - Nhận dữ liệu cập nhật từ body
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
    @UploadedFiles() files: Express.Multer.File[] = [], //  gán mặc định là []
    @Request() req,
  ) {
    const userId = req.user.userId;

    //  Kiểm tra có file mới thì mới xử lý
    if (files && Array.isArray(files)) {
      for (const file of files) {
        if (file.originalname.endsWith('.json')) {
          if (!isValidPostmanCollection(file.path)) {
            throw new BadRequestException(
              'File Postman phải đúng định dạng chuẩn v2.1',
            );
          }

          data.postmanFilePath = file.path;
          data.originalPostmanFileName = file.originalname;
        } else if (file.originalname.endsWith('.js')) {
          data.k6ScriptFilePath = file.path;
          data.originalK6ScriptFileName = file.originalname;
        }
      }
    }

    return this.projectService.updateProject(+id, userId, data);
  }
}
