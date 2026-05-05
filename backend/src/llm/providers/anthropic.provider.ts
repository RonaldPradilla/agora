import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LlMProvider, LlMMessage } from '../llm.interface';

@Injectable()
export class AnthropicProvider implements LlMProvider {
  private readonly logger = new Logger(AnthropicProvider.name);

  constructor(private readonly configService: ConfigService) {}

  async call(messages: LlMMessage[], model: string, timeoutMs: number): Promise<string> {
    const url = this.configService.get<string>('LLM_API_URL', 'https://api.anthropic.com/v1/messages');
    const apiKey = this.configService.get<string>('LLM_API_KEY');

    if (!apiKey) {
      throw new Error('LLM_API_KEY no configurado');
    }

    const systemMessage = messages.find((m) => m.role === 'system');
    const userMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role, content: m.content }));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        system: systemMessage?.content,
        messages: userMessages,
        max_tokens: 300,
        temperature: Number(this.configService.get<number>('LLM_TEMPERATURE', 0.7)),
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });

    const body: any = await response.json();
    if (!response.ok) {
      this.logger.error(`Anthropic error ${response.status}: ${JSON.stringify(body)}`);
      throw new Error(`LLM API error: ${response.status}`);
    }

    const content = body?.content?.[0]?.text;
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
