import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  InternalServerErrorException,
  ForbiddenException,
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
          cuenta_activa: true,
          fecha_registro: new Date(),
        },
      });

      this.logger.log(`Usuario registrado: ${usuarioId}`);

      return { message: 'Cuenta creada exitosamente. Ya puedes iniciar sesión.' };
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

      if (!usuario) {
        throw new UnauthorizedException({ message: 'Credenciales inválidas' });
      }

      const passwordMatch = await bcrypt.compare(password, usuario.password_hash);
      if (!passwordMatch) {
        throw new UnauthorizedException({ message: 'Credenciales inválidas' });
      }

      if (!usuario.cuenta_activa) {
        throw new UnauthorizedException({ message: 'Cuenta inactiva.' });
      }

      const accessToken = this.generateAccessToken(usuario.id);

      await this.prisma.sesion.create({
        data: {
          id: uuidv4(),
          usuario_ID: usuario.id,
          token: accessToken,
          expira_en: new Date(Date.now() + 8 * 60 * 60 * 1000),
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

  async verifyAccessToken(token: string): Promise<{ sub: string; type: string }> {
    const secret = this.configService.get<string>('JWT_SECRET');
    if (!secret) throw new Error('JWT_SECRET no configurado');

    try {
      const payload = this.jwtService.verify<{ sub: string; type: string }>(token, { secret });
      if (!payload?.sub || payload.type !== 'acceso') {
        throw new UnauthorizedException({ message: 'Token inválido o expirado. Por favor inicia sesión.' });
      }
      return payload;
    } catch (error) {
      throw new UnauthorizedException({ message: 'Token inválido o expirado. Por favor inicia sesión.' });
    }
  }

  async getActiveUser(usuarioId: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
    });
    if (!usuario || !usuario.cuenta_activa) {
      throw new ForbiddenException({ message: 'Debes confirmar tu email para acceder al chat.' });
    }
    return usuario;
  }

  private hashSHA256(text: string): string {
    return crypto.createHash('sha256').update(text).digest('hex');
  }

  private generateAccessToken(usuarioId: string): string {
    const payload = { sub: usuarioId, type: 'acceso' };
    const secret = this.configService.get<string>('JWT_SECRET');
    if (!secret) throw new Error('JWT_SECRET no configurado');
    return this.jwtService.sign(payload, { secret, expiresIn: '8h' });
  }
}
