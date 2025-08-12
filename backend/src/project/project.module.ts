import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from './entities/project.entity';
import { fileFilter, multerStorage } from './file-upload.config';
import { User } from 'src/auth/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, User]),
    MulterModule.register({
      storage: multerStorage,
      fileFilter: fileFilter,
    }),
  ],
  controllers: [ProjectController],
  providers: [ProjectService],
})
export class ProjectModule {}
