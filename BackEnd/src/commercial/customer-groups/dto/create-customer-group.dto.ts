import { IsString, IsNumber, IsOptional, IsBoolean, MaxLength, Min, Max } from 'class-validator';

export class CreateCustomerGroupDto {
  @IsString()
  @MaxLength(50)
  code: string;

  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discount_percent?: number;

  @IsOptional()
  @IsNumber()
  credit_limit?: number;

  @IsOptional()
  @IsNumber()
  credit_days?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
