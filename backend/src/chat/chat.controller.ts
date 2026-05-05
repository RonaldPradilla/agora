import { Controller, Post, Body, Req, UseGuards, HttpCode, HttpStatus, Logger, UseInterceptors } from '@nestjs/common';
import { ChatService } from './chat.service';
import { IniciarSesionDto } from './dto/iniciar-sesion.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TimeoutInterceptor } from '../common/interceptors/timeout.interceptor';

interface AuthenticatedRequest {
  user?: { sub: string };
}

@Controller('v1/chat')
@UseInterceptors(TimeoutInterceptor)
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(private readonly chatService: ChatService) {}

  @UseGuards(JwtAuthGuard)
  @Post('sessions')
  @HttpCode(HttpStatus.CREATED)
  async iniciarSesion(@Req() request: AuthenticatedRequest, @Body() iniciarSesionDto: IniciarSesionDto) {
    const userId = request.user?.sub as string;
    this.logger.log(`Creando sesión de chat para usuario ${userId}`);

    return this.chatService.iniciarSesion(userId, iniciarSesionDto.mensaje_inicial);
  }
}
