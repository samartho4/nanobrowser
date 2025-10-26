/**
 * Multimodal Test Handler
 * Handles TEST_MULTIMODAL requests for testing multimodal AI capabilities
 */

import { createLogger } from '../log';
import { HybridAIClient } from '../llm/HybridAIClient';

const logger = createLogger('multimodal-test-handler');

export interface TestMultimodalPayload {
  fileType: 'image' | 'audio' | 'text';
  mimeType: string;
  base64: string;
  prompt: string;
  fileName: string;
}

export interface TestMultimodalResponse {
  ok: boolean;
  text?: string;
  error?: string;
  data?: any;
}

/**
 * Process multimodal test requests
 */
export async function handleTestMultimodal(
  payload: TestMultimodalPayload,
  hybridAIClient: HybridAIClient | null,
): Promise<TestMultimodalResponse> {
  try {
    logger.info('Processing TEST_MULTIMODAL request', {
      fileType: payload.fileType,
      mimeType: payload.mimeType,
      promptLength: payload.prompt.length,
      fileName: payload.fileName,
    });

    // Validate payload
    if (!payload.base64 || !payload.prompt) {
      return {
        ok: false,
        error: 'Missing base64 content or prompt',
      };
    }

    // For text content (like page capture), we can process it directly
    if (payload.fileType === 'text') {
      try {
        // Decode the base64 content
        const decodedContent = atob(payload.base64);

        logger.info('Processing text content', {
          contentLength: decodedContent.length,
        });

        // If we have HybridAIClient, use it for analysis
        if (hybridAIClient) {
          try {
            // Use the hybrid AI client to analyze the text
            const response = await hybridAIClient.invoke({
              prompt: `${payload.prompt}\n\n---\n\nContent to analyze:\n${decodedContent}`,
            });

            logger.info('AI analysis complete');

            return {
              ok: true,
              text: response.content || 'Analysis complete but no response text',
              data: {
                answer: response.content,
                provider: response.provider,
                timestamp: Date.now(),
              },
            };
          } catch (aiError) {
            logger.error('HybridAIClient error:', aiError);
            // Fallback to echo response
            return {
              ok: true,
              text: `Received prompt: "${payload.prompt}"\n\nContent preview (${decodedContent.length} chars):\n${decodedContent.substring(0, 500)}...`,
              data: {
                status: 'no-ai',
                reason: 'HybridAIClient not available',
                timestamp: Date.now(),
              },
            };
          }
        } else {
          // No HybridAIClient available, return a test response
          logger.info('HybridAIClient not available, returning test response');
          return {
            ok: true,
            text: `🧪 Test Response (AI not available):\n\nPrompt: "${payload.prompt}"\n\nContent analyzed: ${decodedContent.length} characters\n\nNote: Configure Gemini API key in Options page for AI-powered analysis.`,
            data: {
              status: 'test-only',
              contentLength: decodedContent.length,
              timestamp: Date.now(),
            },
          };
        }
      } catch (error) {
        logger.error('Error processing text content:', error);
        return {
          ok: false,
          error: `Failed to process text: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
      }
    }

    // For image/audio, return a placeholder response for now
    return {
      ok: true,
      text: `Received ${payload.fileType} file for analysis.\n\nPrompt: "${payload.prompt}"\n\nFile: ${payload.fileName}\n\n(Image/audio analysis support coming soon)`,
      data: {
        fileType: payload.fileType,
        fileName: payload.fileName,
        status: 'placeholder',
        timestamp: Date.now(),
      },
    };
  } catch (error) {
    logger.error('Unexpected error in handleTestMultimodal:', error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
