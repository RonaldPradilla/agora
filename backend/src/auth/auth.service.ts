import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto): Promise<{ message: string }> {
    try {
      const { email, password } = registerDto;

      // Paso 1: Calcular hash del email (nunca se almacena en texto plano)
      const emailHash = this.hashSHA256(email);

      // Paso 2: Verificar unicidad del email por hash
      const existingUser = await this.prisma.usuario.findUnique({
        where: { email_hash: emailHash },
      });

      if (existingUser) {
        throw new BadRequestException({
          errors: [{ field: 'email', message: 'Ya está registrado' }],
        });
      }

      // Paso 3: Generar UUID v4 y hash de contraseña con bcrypt (factor 12)
      const usuarioId = uuidv4();
      const passwordHash = await bcrypt.hash(password, 12);

      // Paso 4: Crear usuario en BD con cuenta inactiva
      await this.prisma.usuario.create({
        data: {
          id: usuarioId,
          email_hash: emailHash,
          password_hash: passwordHash,
          cuenta_activa: false,
          fecha_registro: new Date(),
        },
      });

      this.logger.log(`Usuario creado: ${usuarioId}`);

      // Paso 5: Generar token JWT de verificación
      const jwtToken = this.generateVerificationToken(usuarioId);

      // Paso 6: Guardar token en BD
      await this.prisma.token.create({
        data: {
          id: uuidv4(),
          token: jwtToken,
          tipo: 'verificacion',
          usuario_ID: usuarioId,
          expira_en: new Date(Date.now() + 24 * 60 * 60 * 1000),
          usado: false,
        },
      });

      this.logger.log(`Token de verificación creado para usuario: ${usuarioId}`);

      return {
        message: 'Cuenta creada. Revisa tu correo para confirmar.',
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Error durante registro: ${err.message}`, err.stack);

      throw new InternalServerErrorException({
        message: 'Error interno. Intenta más tarde.',
      });
    }
  }

  private hashSHA256(text: string): string {
    return crypto.createHash('sha256').update(text).digest('hex');
  }

  private generateVerificationToken(usuarioId: string): string {
    const payload = { sub: usuarioId, type: 'verificacion' };

    const secret = this.configService.get<string>('JWT_VERIFICATION_SECRET');
    if (!secret) {
      throw new Error('JWT_VERIFICATION_SECRET no configurado');
    }

    return this.jwtService.sign(payload, { secret, expiresIn: '24h' });
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    try {
      const secret = this.configService.get<string>('JWT_VERIFICATION_SECRET');

      const payload: any = this.jwtService.verify(token, { secret });

      if (payload.type !== 'verificacion') {
        throw new BadRequestException('Token inválido');
      }

      const savedToken = await this.prisma.token.findUnique({
        where: { token },
      });

      if (!savedToken) {
        throw new BadRequestException('Token no encontrado');
      }

      if (savedToken.usado) {
        throw new BadRequestException('Token ya fue utilizado');
      }

      if (new Date() > savedToken.expira_en) {
        throw new BadRequestException('Token expirado');
      }

      await this.prisma.token.update({
        where: { id: savedToken.id },
        data: { usado: true },
      });

      await this.prisma.usuario.update({
        where: { id: payload.sub },
        data: { cuenta_activa: true },
      });

      this.logger.log(`Cuenta verificada: ${payload.sub}`);

      return {
        message: 'Correo verificado exitosamente. Ya puedes iniciar sesión.',
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Error verificando email: ${err.message}`);
      throw new BadRequestException('Token inválido o expirado');
    }
  }
}
