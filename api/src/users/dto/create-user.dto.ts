import { Transform, Type } from 'class-transformer';
import { IsEmail, IsInt, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateUserDto {
  @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(150)
  name: string;

  @Transform(trim) @IsEmail() @MaxLength(255)
  email: string;

  // bcrypt ne prend en compte que les 72 premiers octets du mot de passe
  @IsString() @MinLength(8) @MaxLength(72)
  password: string;

  @Type(() => Number) @IsInt()
  roleId: number;
}
