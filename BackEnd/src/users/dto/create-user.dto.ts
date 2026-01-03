import { IsString, IsInt, IsBoolean, IsOptional } from 'class-validator';

export class CreateUserDto {
  @IsString()
  username: string;

  @IsString()
  password: string;

  @IsString()
  @IsOptional()
  fullName?: string;

  @IsInt()
  roleId: number;

  @IsInt()
  @IsOptional()
  storeId?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
