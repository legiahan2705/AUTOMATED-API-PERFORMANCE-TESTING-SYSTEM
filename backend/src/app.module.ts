// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { ProjectModule } from './project/project.module';
import { TestRunModule } from './test-run/test-run.module';
import { ScheduledTestsModule } from './scheduled-test/scheduled-test.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    // Đọc file .env
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // Dùng DATABASE_URL thay vì tách host/user/pass
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'), // lấy nguyên connection string
        autoLoadEntities: true,
        synchronize: true, 
        ssl: {
          rejectUnauthorized: false, // Render bắt buộc
        },
      }),
    }),

    // Các module khác
    AuthModule,
    ProjectModule,
    TestRunModule,
    ScheduledTestsModule,
    ReportsModule,
  ],
})
export class AppModule {}
