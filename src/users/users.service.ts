import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../entities';
import { UpdateUserDto, AdminUpdateUserDto } from './dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findAll(page = 1, limit = 10) {
    const [users, total] = await this.usersRepository.findAndCount({
      select: [
        'userId',
        'fullname',
        'email',
        'role',
        'avatarUrl',
        'isActive',
        'createdAt',
      ],
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(userId: string) {
    const user = await this.usersRepository.findOne({
      where: { userId },
      select: [
        'userId',
        'fullname',
        'email',
        'role',
        'avatarUrl',
        'isActive',
        'createdAt',
      ],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByEmail(email: string) {
    return this.usersRepository.findOne({
      where: { email },
    });
  }

  async update(
    userId: string,
    updateUserDto: UpdateUserDto,
    currentUserId: string,
  ) {
    if (userId !== currentUserId) {
      throw new ForbiddenException('You can only update your own profile');
    }

    const user = await this.usersRepository.findOne({
      where: { userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.findByEmail(updateUserDto.email);
      if (existingUser) {
        throw new ConflictException('Email already in use');
      }
    }

    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    await this.usersRepository.update(userId, updateUserDto);
    return this.findOne(userId);
  }

  async adminUpdate(userId: string, updateUserDto: AdminUpdateUserDto) {
    const user = await this.usersRepository.findOne({ where: { userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.findByEmail(updateUserDto.email);
      if (existingUser) {
        throw new ConflictException('Email already in use');
      }
    }

    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    await this.usersRepository.update(userId, updateUserDto);
    return this.findOne(userId);
  }

  async remove(userId: string) {
    const user = await this.usersRepository.findOne({ where: { userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Soft delete by deactivating
    await this.usersRepository.update(userId, { isActive: false });
    return { message: 'User deactivated successfully' };
  }

  async getStats() {
    const totalUsers = await this.usersRepository.count();
    const activeUsers = await this.usersRepository.count({
      where: { isActive: true },
    });
    const sellers = await this.usersRepository.count({
      where: { role: UserRole.SELLER },
    });
    const admins = await this.usersRepository.count({
      where: { role: UserRole.ADMIN },
    });

    return {
      totalUsers,
      activeUsers,
      sellers,
      admins,
    };
  }

  async getSellers(page = 1, limit = 10) {
    const [sellers, total] = await this.usersRepository.findAndCount({
      where: { role: UserRole.SELLER, isActive: true },
      select: ['userId', 'fullname', 'email', 'avatarUrl', 'createdAt'],
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      data: sellers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
