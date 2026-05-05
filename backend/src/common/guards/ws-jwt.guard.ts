import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../../auth/auth.service';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient<Socket>();
    const token =
      client.handshake.auth?.token ||
      (typeof client.handshake.headers?.authorization === 'string'
        ? client.handshake.headers.authorization.replace(/^Bearer\s+/i, '')
        : undefined);

    if (!token) {
      client.emit('chat:error', { message: 'Token inválido o expirado. Por favor inicia sesión.' });
      client.disconnect();
      throw new UnauthorizedException('Token inválido o expirado. Por favor inicia sesión.');
    }

    const payload = await this.authService.verifyAccessToken(token);
    await this.authService.getActiveUser(payload.sub);
    client.data.userId = payload.sub;
    return true;
  }
}
