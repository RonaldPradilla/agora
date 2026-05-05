import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AlertaService {
  constructor(private readonly prisma: PrismaService) {}

  async crearAlerta(data: {
    usuario_id: string;
    sesion_id: string;
    score: number;
    palabras_clave: string[];
  }) {
    return this.prisma.alerta.create({
      data: {
        usuario_id: data.usuario_id,
        sesion_id: data.sesion_id,
        score: data.score,
        palabras_clave: data.palabras_clave,
      },
    });
  }
}
