import { IsEmail, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';

export class LoginDto {
  @IsEmail({}, { message: 'El correo electrónico debe ser válido' })
  @IsNotEmpty({ message: 'El correo electrónico es requerido' })
  @Transform(({ value }) => value.toLowerCase().trim())
  email!: string;

  @IsNotEmpty({ message: 'La contraseña es requerida' })
  password!: string;

  constructor(email: string, password: string) {
    this.email = email;
    this.password = password;
  }
}
