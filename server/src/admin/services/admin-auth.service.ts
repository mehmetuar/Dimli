import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AdminUser } from '../entities/admin-user.entity';

@Injectable()
export class AdminAuthService {
  constructor(
    @InjectRepository(AdminUser)
    private adminUserRepository: Repository<AdminUser>,
    private jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    const admin = await this.adminUserRepository.findOne({ where: { email } });
    if (!admin || !(await bcrypt.compare(password, admin.password))) {
      throw new UnauthorizedException('E-posta veya şifre hatalı.');
    }
    const payload = {
      email: admin.email,
      sub: admin.id,
      role: 'admin',
      adminRole: admin.role,
    };
    return {
      access_token: this.jwtService.sign(payload),
      adminRole: admin.role,
      email: admin.email,
    };
  }

  async createAdmin(
    email: string,
    password: string,
    role: string = 'reviewer',
  ): Promise<AdminUser> {
    const existing = await this.adminUserRepository.findOne({
      where: { email },
    });
    if (existing) {
      throw new ConflictException('Bu e-posta zaten kayıtlı.');
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = this.adminUserRepository.create({
      email,
      password: hashedPassword,
      role,
    });
    return this.adminUserRepository.save(admin);
  }
}
