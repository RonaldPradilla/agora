import { Injectable } from '@nestjs/common';
import { AlertaService } from './alerta.service';
import { DetectorRiesgoService, RiesgoResult } from './detector-riesgo.service';

@Injectable()
export class RiesgoService {
  constructor(
    private readonly detectorRiesgoService: DetectorRiesgoService,
    private readonly alertaService: AlertaService,
  ) {}

  detectarMensaje(mensaje: string): RiesgoResult {
    return this.detectorRiesgoService.detect(mensaje);
  }

  async evaluarMensaje(usuario_id: string, sesion_id: string, mensaje: string): Promise<RiesgoResult> {
    const resultado = this.detectorRiesgoService.detect(mensaje);
    if (resultado.requiere_alerta) {
      await this.alertaService.crearAlerta({
        usuario_id,
        sesion_id,
        score: resultado.score,
        palabras_clave: resultado.palabras_clave,
      });
    }
    return resultado;
  }
}
