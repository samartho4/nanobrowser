/**
 * Test utilities for Gemini Nano via Content Script
 */

import { ContentScriptBridge } from './content/ContentScriptBridge';

const bridge = ContentScriptBridge.getInstance();

export async function testContentScriptNano() {
  console.log('🚀 Testing Gemini Nano via Content Script\n');
  console.log('='.repeat(50));

  try {
    // Check if there's an active tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length === 0) {
      console.error('❌ No active tab found. Please open a web page first.');
      console.log('\nTo test:');
      console.log('1. Open any web page (e.g., google.com)');
      console.log('2. Run this test again');
      return;
    }

    console.log('✅ Active tab found:', tabs[0].url);
    console.log('\nInitializing Gemini Nano...');

    const available = await bridge.initialize();
    console.log('Initialization result:', available ? '✅ Available' : '❌ Not available');

    if (!available) {
      console.error('\n❌ Gemini Nano is not available.');
      return;
    }

    // Test detection
    console.log('\n🔍 Testing detection...');
    const caps = await bridge.detectCapabilities();
    console.log('✅ Prompt API:', caps.promptAPI ? 'Available' : 'Not available');
    console.log('✅ Summarizer:', caps.summarizer ? 'Available' : 'Not available');
    console.log('✅ Translator:', caps.translator ? 'Available' : 'Not available');

    if (caps.promptAPI) {
      // Test text generation
      console.log('\n📝 Testing text generation...');
      const prompt = 'Say "Hello from Gemini Nano via content script!" in one sentence.';
      console.log('Prompt:', prompt);

      const response = await bridge.generateText(prompt);
      console.log('Response:', response);
      console.log('✅ Text generation works!');
    }

    console.log('\n' + '='.repeat(50));
    console.log('🎉 Gemini Nano is working via content script!');
  } catch (error) {
    console.log('\n' + '='.repeat(50));
    console.error('❌ Test failed:', error);
  }
}

// Make function available globally
if (typeof globalThis !== 'undefined') {
  (globalThis as any).testContentScriptNano = testContentScriptNano;
}

console.log('✅ Nano content script test utilities loaded. Run testContentScriptNano() to start testing.');
