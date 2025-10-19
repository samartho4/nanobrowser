/**
 * This script is injected into the main page context (not isolated)
 * It has access to window.ai and communicates with the content script via window.postMessage
 */

(function () {
  console.log('[Nano Inject] Script injected into main page context');

  // Check if AI APIs are available
  const ai = (window as any).ai;
  const LanguageModel = ai?.LanguageModel || (window as any).LanguageModel;

  console.log('[Nano Inject] window.ai available:', !!ai);
  console.log('[Nano Inject] window.ai.LanguageModel available:', !!ai?.LanguageModel);
  console.log('[Nano Inject] window.LanguageModel available:', !!(window as any).LanguageModel);

  if (!LanguageModel && !ai) {
    console.warn('[Nano Inject] Neither LanguageModel nor window.ai available');
    return;
  }

  // Listen for messages from content script
  console.log('[Nano Inject] Registering message listener on window');

  const messageListener = async (event: MessageEvent) => {
    // Log EVERY message for debugging
    console.log('[Nano Inject] Listener fired! Type:', event.data?.type);

    const message = event.data;
    if (!message || typeof message !== 'object') {
      console.log('[Nano Inject] Message is not an object, ignoring');
      return;
    }

    // Log all nano messages for debugging (before source check)
    if (message.type?.startsWith('nano:')) {
      console.log(
        '[Nano Inject] Saw nano message:',
        message.type,
        'id:',
        message.id,
        'source:',
        event.source === window ? 'window' : 'other',
      );
    }

    // Only accept messages from same window
    if (event.source !== window) {
      console.log('[Nano Inject] Ignoring message from different source');
      return;
    }

    // Only handle nano request messages
    if (!message.type?.startsWith('nano:')) return;

    // Don't process our own response messages
    if (message.type === 'nano:ready' || message.type === 'nano:response' || message.type === 'nano:error') return;

    console.log('[Nano Inject] Processing message:', message.type, 'id:', message.id);

    try {
      let result: any;

      switch (message.type) {
        case 'nano:detect':
          result = await detectCapabilities();
          break;

        case 'nano:generateText':
          if (!message.payload) throw new Error('Missing payload');
          result = await generateText(message.payload.prompt, message.payload.options || {});
          break;

        case 'nano:summarize':
          if (!message.payload) throw new Error('Missing payload');
          result = await summarize(message.payload.text, message.payload.options || {});
          break;

        case 'nano:translate':
          if (!message.payload) throw new Error('Missing payload');
          result = await translate(message.payload.text, message.payload.targetLang, message.payload.sourceLang);
          break;

        default:
          throw new Error(`Unknown message type: ${message.type}`);
      }

      console.log('[Nano Inject] Sending response for:', message.id);

      // Send response back
      window.postMessage(
        {
          type: 'nano:response',
          id: message.id,
          payload: result,
        },
        window.location.origin,
      );
    } catch (error) {
      console.error('[Nano Inject] Error processing message:', error);
      window.postMessage(
        {
          type: 'nano:error',
          id: message.id,
          error: error instanceof Error ? error.message : String(error),
        },
        window.location.origin,
      );
    }
  };

  window.addEventListener('message', messageListener);
  console.log('[Nano Inject] Listener registered successfully');

  async function detectCapabilities() {
    console.log('[Nano Inject] detectCapabilities called');

    const capabilities = {
      promptAPI: false,
      summarizer: false,
      translator: false,
    };

    // Try window.LanguageModel first (primary API)
    if (LanguageModel) {
      try {
        console.log('[Nano Inject] Checking LanguageModel.availability()...');
        const status = await LanguageModel.availability();
        capabilities.promptAPI = status === 'available' || status === 'readily';
        console.log('[Nano Inject] LanguageModel status:', status, '-> promptAPI:', capabilities.promptAPI);
      } catch (e) {
        console.warn('[Nano Inject] LanguageModel check failed:', e);
      }
    }

    // Check old API structures for compatibility
    if (!capabilities.promptAPI && ai?.languageModel) {
      try {
        const status = await ai.languageModel.capabilities();
        capabilities.promptAPI = status?.available === 'readily' || status?.available === true;
        console.log('[Nano Inject] ai.languageModel status:', status);
      } catch (e) {
        console.warn('[Nano Inject] Prompt API check failed:', e);
      }
    }

    // Check Summarizer API
    if (ai?.summarizer) {
      try {
        const status = await ai.summarizer.capabilities();
        capabilities.summarizer = status?.available === 'readily' || status?.available === true;
      } catch (e) {
        console.warn('[Nano Inject] Summarizer check failed:', e);
      }
    }

    // Check Translator API
    if (ai?.translator) {
      try {
        const status = await ai.translator.capabilities();
        capabilities.translator = status?.available === 'readily' || status?.available === true;
      } catch (e) {
        console.warn('[Nano Inject] Translator check failed:', e);
      }
    }

    return capabilities;
  }

  async function generateText(prompt: string, options: any = {}) {
    console.log('[Nano Inject] generateText called with prompt:', prompt.substring(0, 50) + '...');

    const sessionOptions: any = {
      outputLanguage: 'en', // Specify output language to avoid warning
    };
    if (options.systemPrompt) sessionOptions.systemPrompt = options.systemPrompt;
    if (options.temperature !== undefined) sessionOptions.temperature = options.temperature;
    if (options.topK !== undefined) sessionOptions.topK = options.topK;

    let session: any;

    // Try window.LanguageModel first (primary API)
    if (LanguageModel) {
      console.log('[Nano Inject] Using LanguageModel API');
      session = await LanguageModel.create(sessionOptions);
    }
    // Fallback to old API structure
    else if (ai?.languageModel) {
      console.log('[Nano Inject] Using ai.languageModel API');
      session = await ai.languageModel.create(sessionOptions);
    } else {
      throw new Error('No language model API available');
    }

    console.log('[Nano Inject] Session created, sending prompt...');
    const text = await session.prompt(prompt);
    console.log('[Nano Inject] Response received:', text.substring(0, 50) + '...');

    if (session.destroy) session.destroy();

    return { text };
  }

  async function summarize(text: string, options: any = {}) {
    const summarizer = await ai.summarizer.create(options);
    const summary = await summarizer.summarize(text);
    summarizer.destroy();

    return { summary };
  }

  async function translate(text: string, targetLang: string, sourceLang?: string) {
    const translatorOptions: any = { targetLanguage: targetLang };
    if (sourceLang) translatorOptions.sourceLanguage = sourceLang;

    const translator = await ai.translator.create(translatorOptions);
    const translation = await translator.translate(text);
    translator.destroy();

    return { translation };
  }

  // Signal that we're ready
  window.postMessage({ type: 'nano:ready' }, window.location.origin);
  console.log('[Nano Inject] Ready to handle requests');
})();
