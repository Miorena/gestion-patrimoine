import { Transform, Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateDirectionDto {
	@Transform(trim) @IsString() @IsNotEmpty() @MaxLength(150)
	name: string;
}

export class CreateServiceDto {
	@Transform(trim) @IsString() @IsNotEmpty() @MaxLength(150)
	name: string;

	@Type(() => Number) @IsInt()
	directionId: number;
}

export class CreateAgentDto {
	@Transform(trim) @IsString() @IsNotEmpty() @MaxLength(100)
	lastName: string;

	@Transform(trim) @IsString() @IsNotEmpty() @MaxLength(100)
	firstName: string;

	// Une chaîne vide est enregistrée comme « pas de fonction »
	@IsOptional() @Transform(trim) @IsString() @MaxLength(150)
	position?: string;

	@Type(() => Number) @IsInt()
	serviceId: number;
}

// Renommer une direction ou un service
export class RenameDto {
	@Transform(trim) @IsString() @IsNotEmpty() @MaxLength(150)
	name: string;
}

// Modifier un agent : seuls les champs fournis changent (serviceId déplace l'agent vers un autre service)
export class UpdateAgentDto {
	@IsOptional() @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(100)
	lastName?: string;

	@IsOptional() @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(100)
	firstName?: string;

	// Une chaîne vide efface la fonction
	@IsOptional() @Transform(trim) @IsString() @MaxLength(150)
	position?: string;

	@IsOptional() @Type(() => Number) @IsInt()
	serviceId?: number;
}
