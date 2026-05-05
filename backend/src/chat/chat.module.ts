import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CifradoModule } from '../cifrado/cifrado.module';
import { LlmModule } from '../llm/llm.module';
import { RiesgoModule } from '../riesgo/risgo.module';

@Module({
  imports: [AuthModule, PrismaModule, CifradoModule, LlmModule, RiesgoModule],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway],
})
export class ChatModule {}
