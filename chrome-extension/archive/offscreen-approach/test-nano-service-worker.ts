/**
 * Test script for Gemini Nano integration
 *
 * To use this:
 * 1. Make sure you're using Chrome Canary/Dev with Gemini Nano enabled
 * 2. Build the extension: npm run build
 * 3. Load the extension in Chrome
 * 4. Open DevTools for the background service worker
 * 5. Import and run: testNanoIntegration()
 */

import { GeminiNanoProvider } from './providers/GeminiNanoProvider';
import { detectGeminiNano } from './utils/detection';

/**
 * Test Gemini Nano detection
 */
export async function testDetection() {
  console.log('🔍 Testing Gemini Nano detection...');

  const capabilities = await detectGeminiNano();

  console.log('Capabilities detected:', capabilities);
  console.log('✅ Prompt API:', capabilities.promptAPI ? 'Available' : 'Not available');
  console.log('✅ Summarizer:', capabilities.summarizer ? 'Available' : 'Not available');
  console.log('✅ Translator:', capabilities.translator ? 'Available' : 'Not available');

  return capabilities;
}

/**
 * Test basic text generation
 */
export async function testTextGeneration() {
  console.log('\n📝 Testing text generation...');

  const provider = new GeminiNanoProvider();

  // Initialize
  const isAvailable = await provider.initialize();
  if (!isAvailable) {
    console.error('❌ Gemini Nano is not available');
    return;
  }

  console.log('✅ Provider initialized');

  try {
    const prompt = 'Say hello and introduce yourself in one sentence.';
    console.log('Prompt:', prompt);

    const response = await provider.generateText(prompt);
    console.log('Response:', response);
    console.log('✅ Text generation successful');

    return response;
  } catch (error) {
    console.error('❌ Text generation failed:', error);
    throw error;
  } finally {
    await provider.destroySession();
  }
}

/**
 * Test streaming generation
 */
export async function testStreaming() {
  console.log('\n🌊 Testing streaming generation...');

  const provider = new GeminiNanoProvider();

  const isAvailable = await provider.initialize();
  if (!isAvailable) {
    console.error('❌ Gemini Nano is not available');
    return;
  }

  console.log('✅ Provider initialized');

  try {
    const prompt = 'Count from 1 to 5 slowly.';
    console.log('Prompt:', prompt);
    console.log('Streaming response:');

    let fullResponse = '';
    for await (const chunk of provider.generateStream(prompt)) {
      console.log('Chunk:', chunk);
      fullResponse += chunk;
    }

    console.log('Full response:', fullResponse);
    console.log('✅ Streaming successful');

    return fullResponse;
  } catch (error) {
    console.error('❌ Streaming failed:', error);
    throw error;
  } finally {
    await provider.destroySession();
  }
}

/**
 * Test structured output generation
 */
export async function testStructuredOutput() {
  console.log('\n🏗️ Testing structured output...');

  const provider = new GeminiNanoProvider();

  const isAvailable = await provider.initialize();
  if (!isAvailable) {
    console.error('❌ Gemini Nano is not available');
    return;
  }

  console.log('✅ Provider initialized');

  try {
    // Import zod dynamically
    const { z } = await import('zod');

    const schema = z.object({
      name: z.string(),
      age: z.number(),
      occupation: z.string(),
    });

    const prompt =
      'Generate a JSON object with name (string), age (number), and occupation (string) for a fictional character. Return only the JSON object.';
    console.log('Prompt:', prompt);

    const response = await provider.generateStructured(prompt, schema);
    console.log('Structured response:', response);
    console.log('✅ Structured output successful');

    return response;
  } catch (error) {
    console.error('❌ Structured output failed:', error);
    throw error;
  } finally {
    await provider.destroySession();
  }
}

/**
 * Test summarization (if available)
 */
export async function testSummarization() {
  console.log('\n📄 Testing summarization...');

  const provider = new GeminiNanoProvider();

  const isAvailable = await provider.initialize();
  if (!isAvailable) {
    console.error('❌ Gemini Nano is not available');
    return;
  }

  const capabilities = await provider.checkAvailability();
  if (!capabilities.summarizer) {
    console.warn('⚠️ Summarizer API is not available, skipping test');
    return;
  }

  console.log('✅ Provider initialized');

  try {
    const text = `
      Artificial intelligence (AI) is intelligence demonstrated by machines, 
      in contrast to the natural intelligence displayed by humans and animals. 
      Leading AI textbooks define the field as the study of "intelligent agents": 
      any device that perceives its environment and takes actions that maximize 
      its chance of successfully achieving its goals. Colloquially, the term 
      "artificial intelligence" is often used to describe machines (or computers) 
      that mimic "cognitive" functions that humans associate with the human mind, 
      such as "learning" and "problem solving".
    `;

    console.log('Text to summarize:', text.substring(0, 100) + '...');

    const summary = await provider.summarize(text, {
      type: 'tl;dr',
      length: 'short',
    });

    console.log('Summary:', summary);
    console.log('✅ Summarization successful');

    return summary;
  } catch (error) {
    console.error('❌ Summarization failed:', error);
    throw error;
  }
}

/**
 * Test translation (if available)
 */
export async function testTranslation() {
  console.log('\n🌐 Testing translation...');

  const provider = new GeminiNanoProvider();

  const isAvailable = await provider.initialize();
  if (!isAvailable) {
    console.error('❌ Gemini Nano is not available');
    return;
  }

  const capabilities = await provider.checkAvailability();
  if (!capabilities.translator) {
    console.warn('⚠️ Translator API is not available, skipping test');
    return;
  }

  console.log('✅ Provider initialized');

  try {
    const text = 'Hello, how are you today?';
    const targetLang = 'es'; // Spanish

    console.log('Text to translate:', text);
    console.log('Target language:', targetLang);

    const translation = await provider.translate(text, targetLang);

    console.log('Translation:', translation);
    console.log('✅ Translation successful');

    return translation;
  } catch (error) {
    console.error('❌ Translation failed:', error);
    throw error;
  }
}

/**
 * Run all tests
 */
export async function testNanoIntegration() {
  console.log('🚀 Starting Gemini Nano Integration Tests\n');
  console.log('='.repeat(50));

  try {
    // Test 1: Detection
    const capabilities = await testDetection();

    if (!capabilities.promptAPI) {
      console.error('\n❌ Gemini Nano Prompt API is not available.');
      console.log('\nTo enable Gemini Nano:');
      console.log('1. Use Chrome Canary or Dev (version 127+)');
      console.log('2. Go to chrome://flags/#optimization-guide-on-device-model');
      console.log('3. Set to "Enabled BypassPerfRequirement"');
      console.log('4. Go to chrome://flags/#prompt-api-for-gemini-nano');
      console.log('5. Set to "Enabled"');
      console.log('6. Restart Chrome');
      console.log('7. Visit chrome://components/ and update "Optimization Guide On Device Model"');
      return;
    }

    // Test 2: Text Generation
    await testTextGeneration();

    // Test 3: Streaming
    await testStreaming();

    // Test 4: Structured Output
    await testStructuredOutput();

    // Test 5: Summarization (if available)
    if (capabilities.summarizer) {
      await testSummarization();
    }

    // Test 6: Translation (if available)
    if (capabilities.translator) {
      await testTranslation();
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ All tests completed successfully!');
    console.log('🎉 Gemini Nano integration is working!');
  } catch (error) {
    console.log('\n' + '='.repeat(50));
    console.error('❌ Test suite failed:', error);
    throw error;
  }
}

// Make functions available globally for console testing
if (typeof globalThis !== 'undefined') {
  (globalThis as any).testNanoIntegration = testNanoIntegration;
  (globalThis as any).testDetection = testDetection;
  (globalThis as any).testTextGeneration = testTextGeneration;
  (globalThis as any).testStreaming = testStreaming;
  (globalThis as any).testStructuredOutput = testStructuredOutput;
  (globalThis as any).testSummarization = testSummarization;
  (globalThis as any).testTranslation = testTranslation;
}

console.log('✅ Nano test utilities loaded. Run testNanoIntegration() to start testing.');
