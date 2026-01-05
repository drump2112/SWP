import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  @IsOptional()
  code?: string;

  @IsNumber()
  @IsOptional()
  storeId?: number;

  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  taxCode?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsNumber()
  @IsOptional()
  creditLimit?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}
