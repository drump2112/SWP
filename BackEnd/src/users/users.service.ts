import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private authService: AuthService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const passwordHash = await this.authService.hashPassword(createUserDto.password);

    const user = this.userRepository.create({
      ...createUserDto,
      passwordHash,
    });

    return this.userRepository.save(user);
  }

  async findAll() {
    return this.userRepository.find({
      relations: ['role', 'store'],
      select: ['id', 'username', 'fullName', 'roleId', 'storeId', 'isActive', 'createdAt']
    });
  }

  async findByStore(storeId: number) {
    return this.userRepository.find({
      where: { storeId },
      relations: ['role', 'store'],
      select: ['id', 'username', 'fullName', 'roleId', 'storeId', 'isActive', 'createdAt']
    });
  }

  async findOne(id: number) {
    return this.userRepository.findOne({
      where: { id },
      relations: ['role', 'store'],
      select: ['id', 'username', 'fullName', 'roleId', 'storeId', 'isActive', 'createdAt']
    });
  }

  async update(id: number, updateUserDto: Partial<CreateUserDto>) {
    const updateData: any = { ...updateUserDto };

    if (updateUserDto.password) {
      updateData.passwordHash = await this.authService.hashPassword(updateUserDto.password);
      delete updateData.password;
    }

    await this.userRepository.update(id, updateData);
    return this.findOne(id);
  }

  async remove(id: number) {
    return this.userRepository.delete(id);
  }
}
