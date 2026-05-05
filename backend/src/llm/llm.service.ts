import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LlMMessage, LlMProvider } from './llm.interface';
import { OpenAIProvider } from './providers/openai.provider';
import { AnthropicProvider } from './providers/anthropic.provider';
import { systemPromptTemplate } from './prompts/system-prompt.template';

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly provider: LlMProvider;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;

  constructor(
    private readonly configService: ConfigService,
    openAIProvider: OpenAIProvider,
    anthropicProvider: AnthropicProvider,
  ) {
    const providerName = this.configService.get<string>('LLM_PROVIDER', 'openai').toLowerCase();
    this.model = this.configService.get<string>('LLM_MODEL', 'gpt-4-turbo-preview');
    this.timeoutMs = Number(this.configService.get<number>('LLM_TIMEOUT_MS', 10000));
    this.maxRetries = Number(this.configService.get<number>('LLM_MAX_RETRIES', 3));

    this.provider = providerName === 'anthropic' ? anthropicProvider : openAIProvider;
  }

  buildContext(memoria: Array<{ contexto: string }>): string {
    const rawContext = memoria.map((item) => item.contexto.trim()).filter(Boolean).join('\n---\n');
    if (!rawContext) return 'Sin contexto previo relevante.';
    const maxLength = 16000;
    return rawContext.length > maxLength ? `${rawContext.slice(0, maxLength)}...` : rawContext;
  }

  sanitizeUserInput(text: string): string {
    return text
      .replace(/\S+@\S+\.\S+/g, '[información eliminada]')
      .replace(/\b\d{4,}\b/g, '[información eliminada]')
      .replace(/\b(\d{1,3}[.,]){2,}\d{1,3}\b/g, '[información eliminada]')
      .trim();
  }

  buildMessages(contexto: string, mensaje: string): LlMMessage[] {
    const system = systemPromptTemplate(contexto);
    const userContent = `Usuario dice: ${this.sanitizeUserInput(mensaje)}`;
    return [
      { role: 'system', content: system },
      { role: 'user', content: userContent },
    ];
  }

  async callWithRetries(mensaje: string, contexto: string): Promise<string> {
    const messages = this.buildMessages(contexto, mensaje);
    const baseDelay = 1000;

    for (let attempt = 0; attempt < this.maxRetries; attempt += 1) {
      try {
        return await this.provider.call(messages, this.model, this.timeoutMs);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Intento ${attempt + 1} falló en LLM: ${message}`);

        if (attempt === this.maxRetries - 1) {
          throw error;
        }

        await new Promise((resolve) => setTimeout(resolve, baseDelay * 2 ** attempt));
      }
    }

    throw new Error('Max retries exceeded');
  }

  async streamResponse(mensaje: string, contexto: string): Promise<AsyncGenerator<string>> {
    const messages = this.buildMessages(contexto, mensaje);
    if (!this.provider.stream) {
      const result = await this.callWithRetries(mensaje, contexto);
      async function* singleChunk() {
        yield result;
      }
      return singleChunk();
    }

    return this.provider.stream(messages, this.model, this.timeoutMs);
  }
}
