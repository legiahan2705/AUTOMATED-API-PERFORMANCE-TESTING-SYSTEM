// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { ProjectModule } from './project/project.module';
import { TestRunModule } from './test-run/test-run.module';
import { TestRunController } from './test-run/test-run.controller';
import { PdfController } from './pdf/pdf.controller';
import { PdfModule } from './pdf/pdf.module';



@Module({
  imports: [
    // ConfigModule giúp đọc file .env, để sử dụng biến môi trường như DB_HOST, JWT_SECRET,...
    ConfigModule.forRoot({
      isGlobal: true, // Cho phép dùng ConfigService ở tất cả modules mà không cần import lại
    }),

    // Cấu hình kết nối CSDL bằng TypeORM, sử dụng biến môi trường từ ConfigService
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule], // Đảm bảo ConfigService có sẵn khi inject
      inject: [ConfigService], // Inject ConfigService vào useFactory để lấy biến môi trường
      useFactory: (config: ConfigService) => ({
        type: 'mysql', // Loại cơ sở dữ liệu
        host: config.get('DB_HOST'), // Đọc host từ file .env
        port: parseInt(config.get('DB_PORT', '3306'), 10), // Ép kiểu về số, có mặc định là 3306
        username: config.get('DB_USERNAME'), // Tên đăng nhập DB
        password: config.get('DB_PASSWORD'), // Mật khẩu DB
        database: config.get('DB_NAME'), // Tên DB
        autoLoadEntities: true, // Tự động load các entity mà không cần khai báo thủ công
        synchronize: true, // Tự động đồng bộ cấu trúc DB theo entity (chỉ nên dùng khi dev!)
      }),
    }),

    // Import AuthModule để dùng authentication (login, signup, token, ...)
    AuthModule,

    ProjectModule,

    TestRunModule,

    // Import PdfModule để tạo báo cáo PDF
    PdfModule
  ],
})
export class AppModule {}
