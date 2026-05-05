import { Injectable } from '@nestjs/common';

export interface RiesgoResult {
  score: number;
  palabras_clave: string[];
  requiere_alerta: boolean;
}

@Injectable()
export class DetectorRiesgoService {
  private readonly palabrasAltaRiesgo = [
    'suicidio',
    'matarme',
    'morir',
    'muerte',
    'acabar con todo',
    'no quiero vivir',
    'adiós',
    'despedirme',
  ];

  private readonly palabrasMediaRiesgo = [
    'depresión',
    'ansiedad',
    'solo',
    'vacío',
    'sin esperanza',
  ];

  detect(mensaje: string): RiesgoResult {
    const texto = mensaje.toLowerCase();
    let score = 0;
    const palabrasEncontradas: string[] = [];

    for (const palabra of this.palabrasAltaRiesgo) {
      if (texto.includes(palabra)) {
        score += 0.3;
        palabrasEncontradas.push(palabra);
      }
    }

    for (const palabra of this.palabrasMediaRiesgo) {
      if (texto.includes(palabra)) {
        score += 0.1;
        palabrasEncontradas.push(palabra);
      }
    }

    score = Math.min(score, 1.0);

    return {
      score,
      palabras_clave: [...new Set(palabrasEncontradas)],
      requiere_alerta: score >= 0.7,
    };
  }
}
