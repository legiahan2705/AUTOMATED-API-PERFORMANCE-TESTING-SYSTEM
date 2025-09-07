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
import { GcsService } from './gcs.service';

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    private readonly gcsService: GcsService,
  ) {}

  /**
   * Tạo project mới cho user kèm theo file Postman và K6 (nếu có)
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

    // Tạo và lưu project với GCS paths
    const newProject = this.projectRepo.create({
      ...createProjectDto,
      postmanFilePath: createProjectDto.postmanFilePath, // GCS path
      k6ScriptFilePath: createProjectDto.k6ScriptFilePath, // GCS path
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
      relations: ['user', 'testRuns'],
    });

    if (!project) {
      throw new NotFoundException(
        'Project not found or does not belong to the user',
      );
    }

    // XÓA FILE CHÍNH của project từ GCS
    const filesToDelete = [
      project.postmanFilePath,
      project.k6ScriptFilePath,
    ].filter(Boolean);

    // XÓA FILE test input/result/summary của từng test run từ GCS
    if (project.testRuns) {
      for (const testRun of project.testRuns) {
        [
          testRun.input_file_path,
          testRun.raw_result_path,
          testRun.summary_path,
        ]
          .filter(Boolean)
          .forEach(path => filesToDelete.push(path));
      }
    }

    // Thực hiện xóa files từ GCS
    for (const filePath of filesToDelete) {
      try {
        await this.gcsService.deleteFile(filePath);
      } catch (err) {
        console.warn('Không thể xóa file từ GCS:', filePath, err.message);
      }
    }

    // Xóa project (cascading xóa luôn test_runs và api_result_details)
    await this.projectRepo.remove(project);

    return { message: 'Project deleted successfully (and related files)' };
  }

  /**
   * Cập nhật project
   */
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

    // XÓA FILE CŨ từ GCS nếu có upload file mới
    if (data.postmanFilePath && project.postmanFilePath) {
      try {
        await this.gcsService.deleteFile(project.postmanFilePath);
      } catch (err) {
        console.warn('Không thể xóa file Postman cũ từ GCS:', err.message);
      }
    }

    if (data.k6ScriptFilePath && project.k6ScriptFilePath) {
      try {
        await this.gcsService.deleteFile(project.k6ScriptFilePath);
      } catch (err) {
        console.warn('Không thể xóa file K6 cũ từ GCS:', err.message);
      }
    }

    // Cập nhật các trường
    Object.assign(project, {
      ...data,
      postmanFilePath: data.postmanFilePath || project.postmanFilePath,
      k6ScriptFilePath: data.k6ScriptFilePath || project.k6ScriptFilePath,
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