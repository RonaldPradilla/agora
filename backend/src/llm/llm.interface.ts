export type LlMRole = 'system' | 'user' | 'assistant';

export interface LlMMessage {
  role: LlMRole;
  content: string;
}

export interface LlMProvider {
  call(messages: LlMMessage[], model: string, timeoutMs: number): Promise<string>;
  stream?(messages: LlMMessage[], model: string, timeoutMs: number): AsyncGenerator<string>;
}
