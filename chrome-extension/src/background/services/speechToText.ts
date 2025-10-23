// TODO: This service needs to be updated to use Firebase AI Logic SDK or HybridAIClient
// Currently disabled as @langchain/google-genai was removed during migration
// @ts-nocheck
import { HumanMessage } from '@langchain/core/messages';
import { createLogger } from '../log';
import { type ProviderConfig, speechToTextModelStore } from '@extension/storage';
import { t } from '@extension/i18n';

const logger = createLogger('SpeechToText');

export class SpeechToTextService {
  private llm: any; // ChatGoogleGenerativeAI - temporarily disabled

  private constructor(llm: any) {
    this.llm = llm;
  }

  static async create(providers: Record<string, ProviderConfig>): Promise<SpeechToTextService> {
    try {
      const config = await speechToTextModelStore.getSpeechToTextModel();

      if (!config?.provider || !config?.modelName) {
        throw new Error(t('chat_stt_model_notFound'));
      }

      const provider = providers[config.provider];
      logger.info('Found provider for speech-to-text:', provider ? 'yes' : 'no', provider?.type);

      if (!provider || provider.type !== 'gemini') {
        throw new Error(t('chat_stt_model_notFound'));
      }

      // TODO: Replace with Firebase AI Logic SDK or HybridAIClient
      const llm = null; // Temporarily disabled
      throw new Error('Speech-to-text service is temporarily disabled during migration');
      logger.info(`Speech-to-text service created with model: ${config.modelName}`);
      return new SpeechToTextService(llm);
    } catch (error) {
      logger.error('Failed to create speech-to-text service:', error);
      throw error;
    }
  }

  async transcribeAudio(base64Audio: string): Promise<string> {
    try {
      logger.info('Starting audio transcription...');

      // Create transcription message with audio data
      const transcriptionMessage = new HumanMessage({
        content: [
          {
            type: 'text',
            text: 'Transcribe this audio. Return only the transcribed text without any additional formatting or explanations.',
          },
          {
            type: 'media',
            data: base64Audio,
            mimeType: 'audio/webm',
          },
        ],
      });

      // Get transcription from Gemini
      const transcriptionResponse = await this.llm.invoke([transcriptionMessage]);

      const transcribedText = transcriptionResponse.content.toString().trim();
      logger.info('Audio transcription completed:', transcribedText);

      return transcribedText;
    } catch (error) {
      logger.error('Failed to transcribe audio:', error);
      throw new Error(`Speech transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
