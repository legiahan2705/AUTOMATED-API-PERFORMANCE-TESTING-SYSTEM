// auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt'; // Module xử lý JWT (tạo và xác thực token)
import { PassportModule } from '@nestjs/passport'; // Hỗ trợ chiến lược xác thực (strategy)
import { TypeOrmModule } from '@nestjs/typeorm'; // Kết nối entity với database
import { AuthController } from './auth.controller'; // Controller xử lý các route /auth
import { AuthService } from './auth.service'; // Service xử lý logic đăng ký, đăng nhập
import { User } from './entities/user.entity'; // Entity ánh xạ bảng user trong DB
import { JwtStrategy } from './jwt.strategy'; // Strategy để xác thực JWT trong các request
import { ConfigModule, ConfigService } from '@nestjs/config'; // Đọc biến môi trường từ .env

@Module({
  imports: [
    TypeOrmModule.forFeature([User]), // Cho phép AuthService thao tác với bảng user

    PassportModule, // Kích hoạt hệ thống xác thực sử dụng Passport (được NestJS tích hợp)

    // Cấu hình JWT module bất đồng bộ (async), dùng biến môi trường từ .env
    JwtModule.registerAsync({
      imports: [ConfigModule], // Đảm bảo ConfigService khả dụng
      inject: [ConfigService], // Inject để lấy biến môi trường
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'), // Lấy secret key từ .env để ký token
        signOptions: {
          expiresIn: config.get('JWT_EXPIRES', '7d'), // Thời hạn token (vd: 7 ngày, 3600s)
        },
      }),
    }),
  ],
  controllers: [AuthController], // Gồm các route như POST /login, /signup,...
  providers: [AuthService, JwtStrategy], // Đăng ký service và strategy để inject vào nơi khác
  exports: [JwtStrategy], // Cho phép module khác dùng JwtStrategy (nếu cần bảo vệ route)
})
export class AuthModule {}
