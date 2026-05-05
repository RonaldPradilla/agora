import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class IniciarSesionDto {
  @IsString()
  @IsNotEmpty({ message: 'Mensaje inválido' })
  @MinLength(1, { message: 'Mensaje inválido' })
  @MaxLength(2000, { message: 'Mensaje inválido' })
  mensaje_inicial!: string;
}
