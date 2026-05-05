import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LlmService } from './llm.service';
import { OpenAIProvider } from './providers/openai.provider';
import { AnthropicProvider } from './providers/anthropic.provider';

@Module({
  imports: [ConfigModule],
  providers: [LlmService, OpenAIProvider, AnthropicProvider],
  exports: [LlmService],
})
export class LlmModule {}
