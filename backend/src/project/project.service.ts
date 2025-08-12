import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './entities/project.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { User } from 'src/auth/entities/user.entity';

import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  /**
   * Tạo project mới cho user kèm theo file Postman và K6 (nếu có)
   * Kiểm tra user tồn tại và tên project không bị trùng trong cùng một user
   */
  async create(createProjectDto: CreateProjectDto, userId: number) {
    // Kiểm tra user tồn tại
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Kiểm tra trùng tên project trong cùng user
    const existingProject = await this.projectRepo.findOne({
      where: {
        user: { id: userId },
        name: createProjectDto.name,
      },
      relations: ['user'],
    });

    if (existingProject) {
      throw new BadRequestException('Project with this name already exists.');
    }

    // Chuẩn hóa đường dẫn (nếu có)
    const fixedPostmanPath = createProjectDto.postmanFilePath?.replace(
      /\\/g,
      '/',
    );
    const fixedK6Path = createProjectDto.k6ScriptFilePath?.replace(/\\/g, '/');

    // Tạo và lưu project
    const newProject = this.projectRepo.create({
      ...createProjectDto,
      postmanFilePath: fixedPostmanPath, // dùng path đã chuẩn hóa
      k6ScriptFilePath: fixedK6Path, // dùng path đã chuẩn hóa
      originalPostmanFileName: createProjectDto.originalPostmanFileName,
      originalK6ScriptFileName: createProjectDto.originalK6ScriptFileName,
      headers: createProjectDto.headers,
      body: createProjectDto.body,
      user,
    });

    return this.projectRepo.save(newProject);
  }

  /**
   * Trả về danh sách tất cả project của user hiện tại
   */
  async getProjectsByUser(userId: number) {
    return this.projectRepo.find({
      where: { user: { id: userId } },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Xoá project nếu project đó thuộc về user đang đăng nhập
   */
  async deleteProject(projectId: number, userId: number) {
    const project = await this.projectRepo.findOne({
      where: {
        id: projectId,
        user: { id: userId },
      },
      relations: ['user', 'testRuns'], // Lấy luôn testRuns để biết mấy file liên quan
    });

    if (!project) {
      throw new NotFoundException(
        'Project not found or does not belong to the user',
      );
    }

    // XÓA FILE CHÍNH của project (Postman, K6)
    const filePaths = [project.postmanFilePath, project.k6ScriptFilePath];

    // XÓA FILE test input/result/summary của từng test run
    if (project.testRuns) {
      for (const testRun of project.testRuns) {
        filePaths.push(testRun.input_file_path);
        filePaths.push(testRun.raw_result_path);
        filePaths.push(testRun.summary_path);
      }
    }

    // Thực hiện xóa file (nếu tồn tại)
    for (const file of filePaths) {
      if (file && fs.existsSync(file)) {
        try {
          fs.unlinkSync(file);
        } catch (err) {
          console.warn('Không thể xóa file:', file, err.message);
        }
      }
    }

    // Xóa project (cascading xóa luôn test_runs và api_result_details)
    await this.projectRepo.remove(project);

    return { message: 'Project deleted successfully (and related files)' };
  }

  //  hàm updateProject

  async updateProject(
    projectId: number,
    userId: number,
    data: Partial<CreateProjectDto>,
  ) {
    const project = await this.projectRepo.findOne({
      where: {
        id: projectId,
        user: { id: userId },
      },
      relations: ['user'],
    });

    if (!project) {
      throw new NotFoundException(
        'Project not found or does not belong to the user',
      );
    }

    // XÓA FILE CŨ nếu có upload file mới
    if (
      data.postmanFilePath &&
      project.postmanFilePath &&
      fs.existsSync(project.postmanFilePath)
    ) {
      fs.unlink(project.postmanFilePath, (err) => {
        if (err) console.warn('Không thể xóa file Postman cũ:', err.message);
      });
    }

    if (
      data.k6ScriptFilePath &&
      project.k6ScriptFilePath &&
      fs.existsSync(project.k6ScriptFilePath)
    ) {
      fs.unlink(project.k6ScriptFilePath, (err) => {
        if (err) console.warn('Không thể xóa file K6 cũ:', err.message);
      });
    }

    // Cập nhật các trường text và file
    Object.assign(project, {
      ...data,
      postmanFilePath: data.postmanFilePath?.replace(/\\/g, '/'),
      k6ScriptFilePath: data.k6ScriptFilePath?.replace(/\\/g, '/'),
      originalPostmanFileName:
        data.originalPostmanFileName || project.originalPostmanFileName,
      originalK6ScriptFileName:
        data.originalK6ScriptFileName || project.originalK6ScriptFileName,
      method: data.method || project.method,
      headers: data.headers || project.headers,
      body: data.body || project.body,
    });

    return this.projectRepo.save(project);
  }
}
