/**
 * Test utilities for Gemini Nano via Injected Script
 * Tests the inject script approach where we inject into main page context
 */

export async function testNanoFromBackground() {
  console.log('🚀 Testing Gemini Nano from Service Worker\n');
  console.log('='.repeat(50));

  try {
    // Get active tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length === 0 || !tabs[0].id) {
      console.error('❌ No active tab found');
      console.log('\nPlease:');
      console.log('1. Open a web page (e.g., google.com)');
      console.log('2. Run this test again');
      return;
    }

    console.log('✅ Active tab found:', tabs[0].url);
    console.log('\n🔍 Testing detection...');

    // Test detection
    const detectResponse = await new Promise(resolve => {
      chrome.tabs.sendMessage(
        tabs[0].id!,
        {
          type: 'nano:detect',
          id: 'test-detect-' + Date.now(),
        },
        response => {
          if (chrome.runtime.lastError) {
            console.error('❌ Message error:', chrome.runtime.lastError.message);
            resolve(null);
          } else {
            resolve(response);
          }
        },
      );
    });

    console.log('Detection response:', detectResponse);

    if (!detectResponse) {
      console.error('❌ No response from content script');
      console.log('\nMake sure:');
      console.log('1. The page has fully loaded');
      console.log('2. Check the page console for [Nano Inject] messages');
      return;
    }

    const typedResponse = detectResponse as any;

    if (typedResponse.type === 'nano:error') {
      console.error('❌ Detection failed:', typedResponse.error);
      return;
    }

    if (typedResponse.type === 'nano:response') {
      const caps = typedResponse.payload;
      console.log('✅ Prompt API:', caps.promptAPI ? 'Available' : 'Not available');
      console.log('✅ Summarizer:', caps.summarizer ? 'Available' : 'Not available');
      console.log('✅ Translator:', caps.translator ? 'Available' : 'Not available');

      if (caps.promptAPI) {
        // Test text generation
        console.log('\n📝 Testing text generation...');

        const textResponse = await new Promise(resolve => {
          chrome.tabs.sendMessage(
            tabs[0].id!,
            {
              type: 'nano:generateText',
              id: 'test-text-' + Date.now(),
              payload: {
                prompt: 'Say "Hello from Gemini Nano in Nanobrowser!" in one sentence.',
                options: {},
              },
            },
            response => {
              if (chrome.runtime.lastError) {
                console.error('❌ Message error:', chrome.runtime.lastError.message);
                resolve(null);
              } else {
                resolve(response);
              }
            },
          );
        });

        console.log('Text generation response:', textResponse);

        const typedTextResponse = textResponse as any;

        if (typedTextResponse && typedTextResponse.type === 'nano:response') {
          console.log('Response:', typedTextResponse.payload.text);
          console.log('✅ Text generation works!');
          console.log('\n' + '='.repeat(50));
          console.log('🎉 Gemini Nano is working in Nanobrowser!');
        } else if (typedTextResponse && typedTextResponse.type === 'nano:error') {
          console.error('❌ Text generation failed:', typedTextResponse.error);
        } else {
          console.error('❌ Unexpected response:', typedTextResponse);
        }
      } else {
        console.error('❌ Prompt API not available');
      }
    }
  } catch (error) {
    console.log('\n' + '='.repeat(50));
    console.error('❌ Test failed:', error);
  }
}

// Make function available globally
if (typeof globalThis !== 'undefined') {
  (globalThis as any).testNanoFromBackground = testNanoFromBackground;
}

console.log('✅ Nano inject test utilities loaded.');
console.log('Run testNanoFromBackground() to test Gemini Nano integration.');
