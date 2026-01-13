import { IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateStoreCreditLimitDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  creditLimit?: number | null;
}
