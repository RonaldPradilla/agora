import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LlMProvider, LlMMessage } from '../llm.interface';

@Injectable()
export class OpenAIProvider implements LlMProvider {
  private readonly logger = new Logger(OpenAIProvider.name);

  constructor(private readonly configService: ConfigService) {}

  async call(messages: LlMMessage[], model: string, timeoutMs: number): Promise<string> {
    const url = this.configService.get<string>('LLM_API_URL');
    const apiKey = this.configService.get<string>('LLM_API_KEY');

    if (!url || !apiKey) {
      throw new Error('LLM_API_URL o LLM_API_KEY no configurados');
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 300,
        temperature: Number(this.configService.get<number>('LLM_TEMPERATURE', 0.7)),
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: any = await response.json();
    if (!response.ok) {
      this.logger.error(`LLM error ${response.status}: ${JSON.stringify(body)}`);
      throw new Error(`LLM API error: ${response.status}`);
    }

    const content = (body as any)?.choices?.[0]?.message?.content;
    if (!content || typeof content !== 'string') {
      throw new Error('Respuesta inválida del proveedor LLM');
    }

    return content.trim();
  }

  async *stream(messages: LlMMessage[], model: string, timeoutMs: number): AsyncGenerator<string> {
    const content = await this.call(messages, model, timeoutMs);
    const chunkSize = 80;

    for (let position = 0; position < content.length; position += chunkSize) {
      yield content.slice(position, position + chunkSize);
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }
}
