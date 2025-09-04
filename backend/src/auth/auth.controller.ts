import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // Đăng ký
  @Post('signup')
  signup(@Body() dto: CreateUserDto) {
    return this.authService.signup(dto);
  }

  // Đăng nhập
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // Quên mật khẩu (reset)
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  // Cập nhật thông tin người dùng (tên)
  @Post('update-profile')
  updateProfile(
    @Body('userId') userId: number,
    @Body('name') name: string,
  ) {
    return this.authService.updateProfile(userId, name);
  }

   // Cập nhật email
  @Post('update-email')
  updateEmail(
    @Body('userId') userId: number,
    @Body('newEmail') newEmail: string,
  ) {
    return this.authService.updateEmail(userId, newEmail);
  }



}
