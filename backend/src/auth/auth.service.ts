import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
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
    private readonly mailService: MailService,
  ) {}

  async register(registerDto: RegisterDto): Promise<{ message: string }> {
    try {
      const { email, password } = registerDto;

      // Paso 1: Calcular hash del email
      const emailHash = this.hashSHA256(email);

      // Paso 2: Verificar que el email no esté registrado
      const existingUser = await this.prisma.usuario.findUnique({
        where: { email_hash: emailHash },
      });

      if (existingUser) {
        throw new BadRequestException({
          errors: [
            {
              field: 'email',
              message: 'Ya está registrado',
            },
          ],
        });
      }

      // Paso 3: Generar UUID v4 para el usuario
      const usuarioId = uuidv4();

      // Paso 4: Hash de la contraseña con bcrypt (factor 12)
      const passwordHash = await bcrypt.hash(password, 12);

      // Paso 5: Crear usuario en BD con cuenta inactiva
      const usuario = await this.prisma.usuario.create({
        data: {
          id: usuarioId,
          email_hash: emailHash,
          password_hash: passwordHash,
          cuenta_activa: false,
          fecha_registro: new Date(),
        },
      });

      this.logger.log(`Usuario creado: ${usuarioId}`);

      // Paso 6: Generar token JWT de verificación
      const jwtToken = this.generateVerificationToken(usuarioId);

      // Paso 7: Guardar token en BD
      await this.prisma.token.create({
        data: {
          id: uuidv4(),
          token: jwtToken,
          tipo: 'verificacion',
          usuario_ID: usuarioId,
          expira_en: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 horas
          usado: false,
        },
      });

      this.logger.log(`Token de verificación creado para usuario: ${usuarioId}`);

      // Paso 8: Enviar correo de confirmación
      const frontendUrl = this.configService.get<string>(
        'FRONTEND_URL',
        'https://localhost:5173',
      );

      try {
        await this.mailService.sendVerificationEmail(email, jwtToken, frontendUrl);
      } catch (emailError) {
        // No detener el registro si falla el email
        this.logger.error(`Error enviando email a ${email}: ${emailError.message}`);
      }

      // Paso 9: Respuesta exitosa
      return {
        message: 'Cuenta creada. Revisa tu correo para confirmar.',
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error(`Error durante registro: ${error.message}`, error.stack);

      throw new InternalServerErrorException({
        message: 'Error interno. Intenta más tarde.',
      });
    }
  }

  private hashSHA256(text: string): string {
    return crypto.createHash('sha256').update(text).digest('hex');
  }

  private generateVerificationToken(usuarioId: string): string {
    const payload = {
      sub: usuarioId,
      type: 'verificacion',
    };

    const secret = this.configService.get<string>('JWT_VERIFICATION_SECRET');

    if (!secret) {
      throw new Error('JWT_VERIFICATION_SECRET no configurado');
    }

    return this.jwtService.sign(payload, {
      secret,
      expiresIn: '24h',
    });
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    try {
      // Verificar y decodificar el token
      const secret = this.configService.get<string>('JWT_VERIFICATION_SECRET');

      const payload: any = this.jwtService.verify(token, {
        secret,
      });

      if (payload.type !== 'verificacion') {
        throw new BadRequestException('Token inválido');
      }

      // Buscar el token en BD
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

      // Marcar token como usado y activar cuenta
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

      this.logger.error(`Error verificando email: ${error.message}`);
      throw new BadRequestException('Token inválido o expirado');
    }
  }
}
