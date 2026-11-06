import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListAssetsQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page: number = 1;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit: number = 20;

  // Matches designation or inventory code
  @IsOptional() @IsString()
  search?: string;

  @IsOptional() @Type(() => Number) @IsInt()
  categoryId?: number;

  @IsOptional() @Type(() => Number) @IsInt()
  stateId?: number;
}
