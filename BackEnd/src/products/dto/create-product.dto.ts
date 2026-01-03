import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class CreateProductDto {
  @IsString()
  code: string;

  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsBoolean()
  @IsOptional()
  isFuel?: boolean;
}
