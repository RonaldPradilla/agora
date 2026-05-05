import {
  IsEmail,
  MinLength,
  MaxLength,
  Matches,
  IsNotEmpty,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  Validate,
} from 'class-validator';
import { Transform } from 'class-transformer';

@ValidatorConstraint({ name: 'isPasswordsMatching', async: false })
export class IsPasswordsMatchingConstraint implements ValidatorConstraintInterface {
  validate(confirmPassword: string, args: ValidationArguments) {
    const obj = args.object as any;
    return obj.password === confirmPassword;
  }

  defaultMessage() {
    return 'Las contraseñas no coinciden';
  }
}

export class RegisterDto {
  @IsEmail({}, { message: 'El correo electrónico debe ser válido' })
  @IsNotEmpty({ message: 'El correo electrónico es requerido' })
  @MaxLength(255, { message: 'El correo electrónico no puede exceder 255 caracteres' })
  @Transform(({ value }) => value.toLowerCase().trim())
  email!: string;

  @IsNotEmpty({ message: 'La contraseña es requerida' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @Matches(/(?=.*[A-Z])(?=.*\d)/, {
    message: 'La contraseña debe incluir al menos una mayúscula y un número',
  })
  password!: string;

  @IsNotEmpty({ message: 'La confirmación de contraseña es requerida' })
  @Validate(IsPasswordsMatchingConstraint, {
    message: 'Las contraseñas no coinciden',
  })
  confirmPassword!: string;

  constructor(email: string, password: string, confirmPassword: string) {
    this.email = email;
    this.password = password;
    this.confirmPassword = confirmPassword;
  }
}
