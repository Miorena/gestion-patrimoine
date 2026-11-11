import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export const HISTORY_SORT_KEYS = ['date', 'action', 'asset', 'user'] as const;

export class ListHistoryQueryDto {
	@IsOptional() @Type(() => Number) @IsInt() @Min(1)
	page: number = 1;

	@IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
	limit: number = 20;

	// Matches the asset code or designation, the user name or the details
	@IsOptional() @IsString()
	search?: string;

	// Exact action code (ASSET_CREATED, ASSET_UPDATED, ACQUISITION_VALIDATED)
	@IsOptional() @IsString()
	action?: string;

	@IsOptional() @IsIn(HISTORY_SORT_KEYS)
	sort: (typeof HISTORY_SORT_KEYS)[number] = 'date';

	@IsOptional() @IsIn(['ASC', 'DESC'])
	order: 'ASC' | 'DESC' = 'DESC';
}
