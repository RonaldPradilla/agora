import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AlertaService } from './alerta.service';
import { DetectorRiesgoService } from './detector-riesgo.service';
import { RiesgoService } from './risgo.service';

@Module({
  imports: [PrismaModule],
  providers: [AlertaService, DetectorRiesgoService, RiesgoService],
  exports: [RiesgoService],
})
export class RiesgoModule {}
