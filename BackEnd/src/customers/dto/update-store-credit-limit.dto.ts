import { IsNumber, IsOptional, Min, IsBoolean, IsDateString } from 'class-validator';

export class UpdateStoreCreditLimitDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  creditLimit?: number | null;

  @IsOptional()
  @IsBoolean()
  bypassCreditLimit?: boolean;

  @IsOptional()
  @IsDateString()
  bypassUntil?: string | null;
}

// DTO riêng để toggle bypass cho customer (áp dụng tất cả cửa hàng)
export class ToggleCustomerBypassDto {
  @IsBoolean()
  bypassCreditLimit: boolean;

  @IsOptional()
  @IsDateString()
  bypassUntil?: string | null;
}
