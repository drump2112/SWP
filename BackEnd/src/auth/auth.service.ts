import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User } from '../entities/user.entity';
import { UserToken } from './entities/user-token.entity';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserToken)
    private userTokenRepository: Repository<UserToken>,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const { username, password } = loginDto;

    const user = await this.userRepository.findOne({
      where: { username, isActive: true },
      relations: ['role', 'store'],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      roleCode: user.role?.code || 'NONE',
      storeId: user.storeId,
    };

    const refreshTokenId = crypto.randomUUID();
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(
      { ...payload, jti: refreshTokenId },
      { expiresIn: '7d' },
    );

    // Save refresh token to DB
    await this.userTokenRepository.save({
      id: refreshTokenId,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      isRevoked: false,
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        roleCode: user.role?.code,
        storeId: user.storeId,
        store: user.store
          ? {
              id: user.store.id,
              name: user.store.name,
            }
          : null,
      },
    };
  }

  async refreshToken(token: string) {
    try {
      const payload = this.jwtService.verify(token);

      // Check if token exists and is not revoked
      const tokenDoc = await this.userTokenRepository.findOne({
        where: { id: payload.jti },
      });

      if (!tokenDoc || tokenDoc.isRevoked) {
        throw new UnauthorizedException('Token revoked or invalid');
      }

      const user = await this.validateUser(payload.sub);

      // Revoke old token (Delete it)
      await this.userTokenRepository.delete(payload.jti);

      const newRefreshTokenId = crypto.randomUUID();
      const newPayload: JwtPayload = {
        sub: user.id,
        username: user.username,
        roleCode: user.role?.code || 'NONE',
        storeId: user.storeId,
      };

      const newAccessToken = this.jwtService.sign(newPayload);
      const newRefreshToken = this.jwtService.sign(
        { ...newPayload, jti: newRefreshTokenId },
        { expiresIn: '7d' },
      );

      // Save new refresh token
      await this.userTokenRepository.save({
        id: newRefreshTokenId,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isRevoked: false,
      });

      return {
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
      };
    } catch (e) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      if (payload.jti) {
        await this.userTokenRepository.delete(payload.jti);
      }
    } catch (e) {
      // Ignore error if token is already invalid
    }
  }

  async validateUser(userId: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId, isActive: true },
      relations: [
        'role',
        'role.rolePermissions',
        'role.rolePermissions.permission',
      ],
    });

    if (!user) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return user;
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }
}
