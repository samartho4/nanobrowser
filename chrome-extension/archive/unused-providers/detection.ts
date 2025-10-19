/**
 * Gemini Nano capability detection utilities
 * Detects availability of Chrome's built-in AI APIs
 */

export interface NanoCapabilities {
  promptAPI: boolean;
  summarizer: boolean;
  translator: boolean;
}

/**
 * Detects which Gemini Nano capabilities are available in the current browser
 * @returns Promise resolving to capability flags
 */
export async function detectGeminiNano(): Promise<NanoCapabilities> {
  const capabilities: NanoCapabilities = {
    promptAPI: false,
    summarizer: false,
    translator: false,
  };

  try {
    // Try window.LanguageModel first (primary API)
    const LanguageModel = (globalThis as any)?.LanguageModel;
    if (LanguageModel) {
      try {
        const status = await LanguageModel.availability();
        capabilities.promptAPI = status === 'available' || status === 'readily';
        console.log('LanguageModel API status:', status);
      } catch (error) {
        console.warn('Error checking LanguageModel availability:', error);
      }
    }

    const ai = (globalThis as any)?.ai;

    // Check old API structure (window.ai.languageModel) for compatibility
    if (!capabilities.promptAPI && ai?.languageModel) {
      try {
        const status = await ai.languageModel.capabilities();
        capabilities.promptAPI = status?.available === 'readily' || status?.available === true;
      } catch (error) {
        console.warn('Error checking Prompt API availability:', error);
      }
    }

    // Check Summarizer API
    if (ai?.summarizer) {
      try {
        const status = await ai.summarizer.capabilities();
        capabilities.summarizer = status?.available === 'readily' || status?.available === true;
      } catch (error) {
        console.warn('Error checking Summarizer API availability:', error);
      }
    }

    // Check Translator API
    if (ai?.translator) {
      try {
        const status = await ai.translator.capabilities();
        capabilities.translator = status?.available === 'readily' || status?.available === true;
      } catch (error) {
        console.warn('Error checking Translator API availability:', error);
      }
    }
  } catch (error) {
    console.warn('Error detecting Gemini Nano capabilities:', error);
  }

  return capabilities;
}

/**
 * Checks if Gemini Nano is available and ready for use
 * @returns Promise resolving to true if at least Prompt API is available
 */
export async function isGeminiNanoAvailable(): Promise<boolean> {
  const capabilities = await detectGeminiNano();
  return capabilities.promptAPI;
}
