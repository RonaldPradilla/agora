import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;
  private retryQueue: Array<{
    options: SendMailOptions;
    retries: number;
    lastError?: string;
  }> = [];

  constructor(private readonly configService: ConfigService) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const smtpPort = this.configService.get<number>('SMTP_PORT') || 587;
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPass = this.configService.get<string>('SMTP_PASS');
    const smtpFrom = this.configService.get<string>('SMTP_FROM', 'noreply@agora.com');

    if (!smtpHost) {
      this.logger.warn(
        'SMTP_HOST no configurado. Usando modo test (output a consola)',
      );
      this.transporter = nodemailer.createTransport({
        streamTransport: true,
        newline: 'unix',
      } as any);
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: smtpUser
        ? {
            user: smtpUser,
            pass: smtpPass,
          }
        : undefined,
    });

    this.logger.log(`Mail transporter configurado para ${smtpHost}:${smtpPort}`);
  }

  async sendVerificationEmail(
    email: string,
    token: string,
    frontendUrl: string = 'https://localhost:3000',
  ): Promise<void> {
    const verificationUrl = `${frontendUrl}/verify-email?token=${token}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #007bff; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f8f9fa; padding: 20px; margin: 20px 0; }
            .button { display: inline-block; background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Bienvenido a Ágora</h1>
            </div>
            <div class="content">
              <h2>Verifica tu correo electrónico</h2>
              <p>Para completar el registro en nuestra plataforma de apoyo emocional, haz clic en el botón de abajo:</p>
              <a href="${verificationUrl}" class="button">Verificar Correo</a>
              <p>O copia este enlace en tu navegador:</p>
              <p><code>${verificationUrl}</code></p>
              <p>Este enlace es válido por 24 horas.</p>
            </div>
            <div class="footer">
              <p>Si no solicitaste esta cuenta, ignora este correo.</p>
              <p>&copy; 2026 Ágora. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const mailOptions: SendMailOptions = {
      to: email,
      subject: 'Verifica tu correo electrónico en Ágora',
      html: htmlContent,
    };

    try {
      await this.sendMail(mailOptions);
      this.logger.log(`Correo de verificación enviado a ${email}`);
    } catch (error) {
      this.logger.error(`Error al enviar correo a ${email}: ${error.message}`);
      // Registrar en cola de reintentos
      this.addToRetryQueue(mailOptions);
      // No lanzar la excepción para permitir que el registro se complete
    }
  }

  private async sendMail(options: SendMailOptions): Promise<void> {
    const smtpFrom = this.configService.get<string>('SMTP_FROM', 'noreply@agora.com');
    return new Promise((resolve, reject) => {
      this.transporter.sendMail(
        {
          from: smtpFrom,
          ...options,
        },
        (error, info) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        },
      );
    });
  }

  private addToRetryQueue(options: SendMailOptions): void {
    this.retryQueue.push({
      options,
      retries: 0,
      lastError: new Date().toISOString(),
    });

    // Iniciar reintentos con backoff exponencial
    this.retryWithBackoff(options, 0);
  }

  private retryWithBackoff(options: SendMailOptions, attemptNumber: number): void {
    const maxRetries = 3;
    if (attemptNumber >= maxRetries) {
      this.logger.error(
        `Fallo definitivo en envío de correo a ${options.to} después de ${maxRetries} intentos`,
      );
      return;
    }

    // Backoff exponencial: 5s, 10s, 20s
    const delayMs = 5000 * Math.pow(2, attemptNumber);

    setTimeout(async () => {
      try {
        await this.sendMail(options);
        this.logger.log(
          `Reintento exitoso para ${options.to} (intento ${attemptNumber + 1})`,
        );
        // Remover de la cola
        this.retryQueue = this.retryQueue.filter((item) => item.options.to !== options.to);
      } catch (error) {
        this.logger.warn(
          `Fallo en reintento ${attemptNumber + 1} para ${options.to}: ${error.message}`,
        );
        this.retryWithBackoff(options, attemptNumber + 1);
      }
    }, delayMs);
  }

  getRetryQueue(): any[] {
    return this.retryQueue;
  }
}
