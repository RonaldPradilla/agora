import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
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

      const emailHash = this.hashSHA256(email);

      const existingUser = await this.prisma.usuario.findUnique({
        where: { email_hash: emailHash },
      });

      if (existingUser) {
        throw new BadRequestException({
          errors: [{ field: 'email', message: 'Ya está registrado' }],
        });
      }

      const usuarioId = uuidv4();
      const passwordHash = await bcrypt.hash(password, 12);

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

      const jwtToken = this.generateVerificationToken(usuarioId);

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

      return { message: 'Cuenta creada. Revisa tu correo para confirmar.' };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;

      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Error durante registro: ${err.message}`, err.stack);
      throw new InternalServerErrorException({ message: 'Error interno. Intenta más tarde.' });
    }
  }

  async login(loginDto: LoginDto): Promise<{ accessToken: string; message: string }> {
    try {
      const { email, password } = loginDto;

      const emailHash = this.hashSHA256(email);

      const usuario = await this.prisma.usuario.findUnique({
        where: { email_hash: emailHash },
      });

      // Mismo mensaje para usuario no encontrado y contraseña incorrecta (evita enumeración)
      if (!usuario) {
        throw new UnauthorizedException({ message: 'Credenciales inválidas' });
      }

      const passwordMatch = await bcrypt.compare(password, usuario.password_hash);
      if (!passwordMatch) {
        throw new UnauthorizedException({ message: 'Credenciales inválidas' });
      }

      if (!usuario.cuenta_activa) {
        throw new UnauthorizedException({
          message: 'Cuenta no verificada. Revisa tu correo para activarla.',
        });
      }

      // Generar token de acceso
      const accessToken = this.generateAccessToken(usuario.id);

      // Guardar sesión en BD
      await this.prisma.sesion.create({
        data: {
          id: uuidv4(),
          usuario_ID: usuario.id,
          token: accessToken,
          expira_en: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 horas
        },
      });

      this.logger.log(`Sesión iniciada: ${usuario.id}`);

      return { accessToken, message: 'Sesión iniciada correctamente.' };
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;

      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Error durante login: ${err.message}`, err.stack);
      throw new InternalServerErrorException({ message: 'Error interno. Intenta más tarde.' });
    }
  }

  private hashSHA256(text: string): string {
    return crypto.createHash('sha256').update(text).digest('hex');
  }

  private generateVerificationToken(usuarioId: string): string {
    const payload = { sub: usuarioId, type: 'verificacion' };
    const secret = this.configService.get<string>('JWT_VERIFICATION_SECRET');
    if (!secret) throw new Error('JWT_VERIFICATION_SECRET no configurado');
    return this.jwtService.sign(payload, { secret, expiresIn: '24h' });
  }

  private generateAccessToken(usuarioId: string): string {
    const payload = { sub: usuarioId, type: 'acceso' };
    const secret = this.configService.get<string>('JWT_SECRET');
    if (!secret) throw new Error('JWT_SECRET no configurado');
    return this.jwtService.sign(payload, { secret, expiresIn: '8h' });
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    try {
      const secret = this.configService.get<string>('JWT_VERIFICATION_SECRET');
      const payload: any = this.jwtService.verify(token, { secret });

      if (payload.type !== 'verificacion') {
        throw new BadRequestException('Token inválido');
      }

      const savedToken = await this.prisma.token.findUnique({ where: { token } });

      if (!savedToken) throw new BadRequestException('Token no encontrado');
      if (savedToken.usado) throw new BadRequestException('Token ya fue utilizado');
      if (new Date() > savedToken.expira_en) throw new BadRequestException('Token expirado');

      await this.prisma.token.update({ where: { id: savedToken.id }, data: { usado: true } });
      await this.prisma.usuario.update({ where: { id: payload.sub }, data: { cuenta_activa: true } });

      this.logger.log(`Cuenta verificada: ${payload.sub}`);

      return { message: 'Correo verificado exitosamente. Ya puedes iniciar sesión.' };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;

      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Error verificando email: ${err.message}`);
      throw new BadRequestException('Token inválido o expirado');
    }
  }
}
