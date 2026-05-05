import { Logger, UseGuards } from '@nestjs/common';
import { WebSocketGateway, OnGatewayConnection, SubscribeMessage, ConnectedSocket, MessageBody } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { WsJwtGuard } from '../common/guards/ws-jwt.guard';
import { MensajeChatDto } from './dto/mensaje-chat.dto';

@WebSocketGateway({ namespace: '/chat', cors: { origin: true, credentials: true } })
@UseGuards(WsJwtGuard)
export class ChatGateway implements OnGatewayConnection {
  private readonly logger = new Logger(ChatGateway.name);

  constructor(private readonly chatService: ChatService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Cliente conectado a chat: ${client.id}`);
  }

  @SubscribeMessage('chat:message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: MensajeChatDto,
  ) {
    const userId = client.data.userId as string;

    if (!data?.sesion_id || !data?.mensaje || typeof data.timestamp !== 'string') {
      client.emit('chat:error', { message: 'Mensaje inválido' });
      return;
    }

    try {
      const stream = this.chatService.streamSessionResponse(userId, data);
      for await (const chunk of stream) {
        if (!chunk.is_final) {
          client.emit('chat:response', {
            sesion_id: chunk.sesion_id,
            chunk: chunk.chunk,
            is_final: false,
            timestamp: chunk.timestamp,
          });
        } else {
          client.emit('chat:response', {
            sesion_id: chunk.sesion_id,
            chunk: '',
            is_final: true,
            score_riesgo: chunk.score_riesgo,
            timestamp: chunk.timestamp,
          });
        }
      }
    } catch (error) {
      this.logger.error('Error procesando mensaje de chat', error as Error);
      client.emit('chat:error', {
        message: 'No pude procesar tu mensaje. ¿Podrías intentar de nuevo?',
      });
    }
  }
}
