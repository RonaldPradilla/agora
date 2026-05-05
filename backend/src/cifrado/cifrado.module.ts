import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CifradoService } from './cifrado.service';

@Global()
@Module({ imports: [ConfigModule], providers: [CifradoService], exports: [CifradoService] })
export class CifradoModule {}
