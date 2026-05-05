import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CifradoService } from '../cifrado/cifrado.service';
import { LlmService } from '../llm/llm.service';
import { RiesgoService } from '../riesgo/risgo.service';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly rateLimitSessionsPerHour = Number(process.env.RATE_LIMIT_SESSIONS_PER_HOUR || 10);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cifradoService: CifradoService,
    private readonly llmService: LlmService,
    private readonly riesgoService: RiesgoService,
    private readonly authService: AuthService,
  ) {}

  private getRateLimitWindow(): Date {
    return new Date(Date.now() - 1000 * 60 * 60);
  }

  async iniciarSesion(usuarioId: string, mensaje_inicial: string) {
    await this.authService.getActiveUser(usuarioId);

    const limiteDesde = this.getRateLimitWindow();
    const sesionesCreadas = await this.prisma.chatSesion.count({
      where: {
        usuario_id: usuarioId,
        fecha_inicio: { gte: limiteDesde },
      },
    });

    if (sesionesCreadas >= this.rateLimitSessionsPerHour) {
      throw new HttpException(
        { message: 'Has alcanzado el límite de sesiones. Espera 1 hora.' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const riesgoUsuario = this.riesgoService.detectarMensaje(mensaje_inicial);

    const sesion = await this.prisma.$transaction(async (tx) => {
      const nuevaSesion = await tx.chatSesion.create({
        data: {
          usuario_id: usuarioId,
          estado: 'activa',
          fecha_inicio: new Date(),
        },
      });

      const mensajeCifrado = await this.cifradoService.encrypt(mensaje_inicial);
      await tx.chatMensaje.create({
        data: {
          sesion_id: nuevaSesion.id,
          remitente: 'usuario',
          contenido: mensajeCifrado.encrypted,
          iv: mensajeCifrado.iv,
          auth_tag: mensajeCifrado.authTag,
          timestamp: new Date(),
          score_riesgo: riesgoUsuario.score,
        },
      });

      return nuevaSesion;
    });

    if (riesgoUsuario.requiere_alerta) {
      await this.riesgoService.evaluarMensaje(usuarioId, sesion.id, mensaje_inicial);
    }

    const memoria = await this.prisma.memoriaIA.findMany({
      where: { usuario_id: usuarioId, activo: true },
      orderBy: { relevancia: 'desc' },
      take: 10,
    });

    const contextoPrompt = this.llmService.buildContext(memoria);
    let respuestaIA: string;
    let fallback = false;

    try {
      respuestaIA = await this.llmService.callWithRetries(mensaje_inicial, contextoPrompt);
    } catch (error) {
      this.logger.error('LLM no disponible', error as Error);
      respuestaIA =
        'Disculpa, el asistente no está disponible en este momento. Intenta de nuevo en unos minutos.';
      fallback = true;
    }

    const respuestaCifrada = await this.cifradoService.encrypt(respuestaIA);
    await this.prisma.chatMensaje.create({
      data: {
        sesion_id: sesion.id,
        remitente: 'ia',
        contenido: respuestaCifrada.encrypted,
        iv: respuestaCifrada.iv,
        auth_tag: respuestaCifrada.authTag,
        timestamp: new Date(),
      },
    });

    return {
      sesion_id: sesion.id,
      respuesta_ia: respuestaIA,
      score_riesgo: riesgoUsuario.score,
      timestamp: new Date().toISOString(),
      fallback,
    };
  }

  async iniciarSesionWithToken(token: string, mensaje_inicial: string) {
    const payload = await this.authService.verifyAccessToken(token);
    await this.authService.getActiveUser(payload.sub);
    return this.iniciarSesion(payload.sub, mensaje_inicial);
  }

  async getActiveSession(usuarioId: string, sesionId: string) {
    return this.prisma.chatSesion.findFirst({
      where: {
        id: sesionId,
        usuario_id: usuarioId,
        estado: 'activa',
      },
    });
  }

  async *streamSessionResponse(usuarioId: string, payload: { sesion_id: string; mensaje: string; timestamp: string }) {
    const sesion = await this.getActiveSession(usuarioId, payload.sesion_id);
    if (!sesion) {
      throw new Error('Sesión no válida o cerrada');
    }

    const riesgoUsuario = await this.riesgoService.evaluarMensaje(usuarioId, sesion.id, payload.mensaje);
    const mensajeCifrado = await this.cifradoService.encrypt(payload.mensaje);
    await this.prisma.chatMensaje.create({
      data: {
        sesion_id: sesion.id,
        remitente: 'usuario',
        contenido: mensajeCifrado.encrypted,
        iv: mensajeCifrado.iv,
        auth_tag: mensajeCifrado.authTag,
        timestamp: new Date(payload.timestamp),
        score_riesgo: riesgoUsuario.score,
      },
    });

    const memoria = await this.prisma.memoriaIA.findMany({
      where: { usuario_id: usuarioId, activo: true },
      orderBy: { relevancia: 'desc' },
      take: 10,
    });

    const contextoPrompt = this.llmService.buildContext(memoria);
    let fullResponse = '';

    try {
      const stream = await this.llmService.streamResponse(payload.mensaje, contextoPrompt);
      for await (const chunk of stream) {
        fullResponse += chunk;
        yield {
          sesion_id: payload.sesion_id,
          chunk,
          is_final: false,
          timestamp: new Date().toISOString(),
        };
      }
    } catch (error) {
      this.logger.error('Error en streaming LLM', error as Error);
      throw new Error('No pude procesar tu mensaje. ¿Podrías intentar de nuevo?');
    }

    const respuestaCifrada = await this.cifradoService.encrypt(fullResponse);
    await this.prisma.chatMensaje.create({
      data: {
        sesion_id: sesion.id,
        remitente: 'ia',
        contenido: respuestaCifrada.encrypted,
        iv: respuestaCifrada.iv,
        auth_tag: respuestaCifrada.authTag,
        timestamp: new Date(),
      },
    });

    yield {
      sesion_id: payload.sesion_id,
      chunk: '',
      is_final: true,
      score_riesgo: riesgoUsuario.score,
      timestamp: new Date().toISOString(),
    };
  }
}
