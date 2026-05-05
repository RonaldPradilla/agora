import { IsNotEmpty, IsString, MaxLength, MinLength, IsUUID, IsISO8601 } from 'class-validator';

export class MensajeChatDto {
  @IsUUID('4', { message: 'sesion_id inválido' })
  sesion_id!: string;

  @IsString()
  @IsNotEmpty({ message: 'Mensaje inválido' })
  @MinLength(1, { message: 'Mensaje inválido' })
  @MaxLength(2000, { message: 'Mensaje inválido' })
  mensaje!: string;

  @IsISO8601({}, { message: 'timestamp inválido' })
  timestamp!: string;
}
