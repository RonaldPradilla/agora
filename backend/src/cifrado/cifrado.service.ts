import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

@Injectable()
export class CifradoService {
  constructor(private readonly configService: ConfigService) {}

  private getKey(): Buffer {
    const rawKey = this.configService.get<string>('ENCRYPTION_KEY');
    if (!rawKey) {
      throw new Error('ENCRYPTION_KEY no configurada');
    }

    if (/^[0-9a-fA-F]{64}$/.test(rawKey)) {
      return Buffer.from(rawKey, 'hex');
    }

    const keyBuffer = Buffer.from(rawKey, 'base64');
    if (keyBuffer.length === 32) {
      return keyBuffer;
    }

    if (rawKey.length === 32) {
      return Buffer.from(rawKey, 'utf8');
    }

    throw new Error('ENCRYPTION_KEY debe ser 32 bytes en hex, base64 o texto plano válido');
  }

  async encrypt(texto: string): Promise<{ encrypted: string; iv: string; authTag: string }> {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.getKey(), iv);
    let encrypted = cipher.update(texto, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag,
    };
  }

  async decrypt(encrypted: string, ivHex: string, authTagHex: string): Promise<string> {
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = createDecipheriv('aes-256-gcm', this.getKey(), iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
