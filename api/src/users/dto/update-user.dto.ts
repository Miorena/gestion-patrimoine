import { Transform, Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

// Tous les champs sont facultatifs ; l'adresse e-mail n'est pas modifiable (c'est l'identifiant de connexion)
export class UpdateUserDto {
  @IsOptional() @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(150)
  name?: string;

  @IsOptional() @Type(() => Number) @IsInt()
  roleId?: number;

  // Réinitialisation du mot de passe par l'administrateur
  @IsOptional() @IsString() @MinLength(8) @MaxLength(72)
  password?: string;
}
