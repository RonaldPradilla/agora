import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { AuthService } from '../../auth/auth.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authorization = request.headers?.authorization as string | undefined;
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined;

    if (!token) {
      throw new UnauthorizedException({ message: 'Token inválido o expirado. Por favor inicia sesión.' });
    }

    const payload = await this.authService.verifyAccessToken(token);
    const user = await this.authService.getActiveUser(payload.sub);

    if (!user) {
      throw new ForbiddenException({ message: 'Debes confirmar tu email para acceder al chat.' });
    }

    request.user = payload;
    request.userEntity = user;
    return true;
  }
}
