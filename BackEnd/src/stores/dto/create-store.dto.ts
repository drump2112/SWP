import { IsString, IsInt, IsBoolean, IsOptional } from 'class-validator';

export class CreateStoreDto {
  @IsString()
  code: string;

  @IsString()
  name: string;

  @IsString()
  address: string;

  @IsString()
  phone: string;

  @IsInt()
  regionId: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
