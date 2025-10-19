/**
 * Test utilities for Gemini Nano via Offscreen Document
 * These functions test the offscreen bridge communication
 */

import { OffscreenBridge } from './offscreen/OffscreenBridge';

const bridge = OffscreenBridge.getInstance();

/**
 * Test Gemini Nano detection via offscreen
 */
export async function testOffscreenDetection() {
  console.log('🔍 Testing Gemini Nano detection via offscreen...');

  try {
    const capabilities = await bridge.detectCapabilities();

    console.log('Capabilities detected:', capabilities);
    console.log('✅ Prompt API:', capabilities.promptAPI ? 'Available' : 'Not available');
    console.log('✅ Summarizer:', capabilities.summarizer ? 'Available' : 'Not available');
    console.log('✅ Translator:', capabilities.translator ? 'Available' : 'Not available');

    return capabilities;
  } catch (error) {
    console.error('❌ Detection failed:', error);
    throw error;
  }
}

/**
 * Test basic text generation via offscreen
 */
export async function testOffscreenTextGeneration() {
  console.log('\n📝 Testing text generation via offscreen...');

  try {
    const prompt = 'Say "Hello from Gemini Nano via offscreen document!" in one sentence.';
    console.log('Prompt:', prompt);

    const response = await bridge.generateText(prompt);
    console.log('Response:', response);
    console.log('✅ Text generation successful');

    return response;
  } catch (error) {
    console.error('❌ Text generation failed:', error);
    throw error;
  }
}

/**
 * Test streaming generation via offscreen
 */
export async function testOffscreenStreaming() {
  console.log('\n🌊 Testing streaming generation via offscreen...');

  try {
    const prompt = 'Count from 1 to 5 slowly.';
    console.log('Prompt:', prompt);
    console.log('Streaming response:');

    let fullResponse = '';
    await bridge.generateStream(prompt, {}, chunk => {
      console.log('Chunk:', chunk);
      fullResponse += chunk;
    });

    console.log('Full response:', fullResponse);
    console.log('✅ Streaming successful');

    return fullResponse;
  } catch (error) {
    console.error('❌ Streaming failed:', error);
    throw error;
  }
}

/**
 * Test summarization via offscreen
 */
export async function testOffscreenSummarization() {
  console.log('\n📄 Testing summarization via offscreen...');

  try {
    const text = `
      Artificial intelligence (AI) is intelligence demonstrated by machines, 
      in contrast to the natural intelligence displayed by humans and animals. 
      Leading AI textbooks define the field as the study of "intelligent agents": 
      any device that perceives its environment and takes actions that maximize 
      its chance of successfully achieving its goals.
    `;

    console.log('Text to summarize:', text.substring(0, 100) + '...');

    const summary = await bridge.summarize(text, {
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
 * Run all offscreen tests
 */
export async function testNanoOffscreen() {
  console.log('🚀 Starting Gemini Nano Offscreen Tests\n');
  console.log('='.repeat(50));

  try {
    // Test 1: Initialize
    console.log('Initializing offscreen bridge...');
    const available = await bridge.initialize();
    console.log('Initialization result:', available ? '✅ Available' : '❌ Not available');

    if (!available) {
      console.error('\n❌ Gemini Nano is not available.');
      console.log('\nMake sure you:');
      console.log('1. Are using Chrome Canary or Dev (v127+)');
      console.log('2. Have enabled the required flags');
      console.log('3. Have downloaded the model at chrome://components/');
      return;
    }

    // Test 2: Detection
    await testOffscreenDetection();

    // Test 3: Text Generation
    await testOffscreenTextGeneration();

    // Test 4: Streaming
    await testOffscreenStreaming();

    // Test 5: Summarization (if available)
    const caps = await bridge.detectCapabilities();
    if (caps.summarizer) {
      await testOffscreenSummarization();
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ All offscreen tests completed successfully!');
    console.log('🎉 Gemini Nano is working via offscreen document!');
  } catch (error) {
    console.log('\n' + '='.repeat(50));
    console.error('❌ Test suite failed:', error);
    throw error;
  }
}

// Make functions available globally for console testing
if (typeof globalThis !== 'undefined') {
  (globalThis as any).testNanoOffscreen = testNanoOffscreen;
  (globalThis as any).testOffscreenDetection = testOffscreenDetection;
  (globalThis as any).testOffscreenTextGeneration = testOffscreenTextGeneration;
  (globalThis as any).testOffscreenStreaming = testOffscreenStreaming;
  (globalThis as any).testOffscreenSummarization = testOffscreenSummarization;
}

console.log('✅ Nano offscreen test utilities loaded. Run testNanoOffscreen() to start testing.');
