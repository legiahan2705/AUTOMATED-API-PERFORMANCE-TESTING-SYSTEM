import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    @InjectRepository(User) private usersRepo: Repository<User>,
  ) {}

  // Đăng ký tài khoản mới
  async signup(dto: CreateUserDto) {
    const existing = await this.usersRepo.findOne({ where: { email: dto.email } });
    if (existing) throw new BadRequestException('Email đã được sử dụng');

    const hashed = await bcrypt.hash(dto.password, 10);
    const newUser = this.usersRepo.create({ ...dto, password: hashed });
    await this.usersRepo.save(newUser);

    return { message: 'Đăng ký thành công' };
  }

  // Đăng nhập
  async login(dto: LoginDto) {
    const user = await this.usersRepo.findOne({ where: { email: dto.email } });
    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Sai email hoặc mật khẩu');
    }

    const payload = { sub: user.id, name: user.name, email: user.email };
    const token = await this.jwtService.signAsync(payload);

    return { token, user: payload };
  }

  // Quên mật khẩu
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.usersRepo.findOne({ where: { email: dto.email } });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');

    user.password = await bcrypt.hash(dto.newPassword, 10);
    await this.usersRepo.save(user);

    return { message: 'Đổi mật khẩu thành công' };
  }
}
