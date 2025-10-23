/**
 * Paste this in the Chrome DevTools console to test Gemini Nano integration
 * Make sure you're on a page with the extension loaded
 */

console.log('🧪 Starting Gemini Nano Integration Test...\n');

// Test 1: Check if LanguageModel is available
console.log('Test 1: Checking LanguageModel availability...');
if (window.LanguageModel) {
  console.log('✅ window.LanguageModel is available');
} else if (window.ai?.LanguageModel) {
  console.log('✅ window.ai.LanguageModel is available');
} else {
  console.log('❌ LanguageModel is NOT available');
  console.log('Make sure Gemini Nano flags are enabled!');
}

// Test 2: Check API status
console.log('\nTest 2: Checking API status...');
const LanguageModel = window.LanguageModel || window.ai?.LanguageModel;
if (LanguageModel) {
  LanguageModel.availability()
    .then(status => {
      console.log(`API Status: ${status}`);
      if (status === 'readily' || status === 'available') {
        console.log('✅ API is ready to use!');

        // Test 3: Try generating text
        console.log('\nTest 3: Testing text generation...');
        LanguageModel.create({ outputLanguage: 'en' })
          .then(session => {
            console.log('✅ Session created');
            return session.prompt('Say "Hello from Gemini Nano!" in one sentence.').then(response => {
              console.log('✅ Response received:');
              console.log(response);
              session.destroy();

              // Test 4: Test extension bridge
              console.log('\nTest 4: Testing extension bridge...');

              let bridgeTestComplete = false;

              const messageHandler = event => {
                if (event.source !== window) return;

                const message = event.data;
                if (message.type === 'nano:response' && message.id === 'console-test') {
                  console.log('✅ Bridge response received:');
                  console.log(JSON.stringify(message.payload, null, 2));
                  window.removeEventListener('message', messageHandler);
                  bridgeTestComplete = true;

                  console.log('\n🎉 All tests passed!');
                  console.log('\nYour Gemini Nano integration is working correctly!');
                } else if (message.type === 'nano:error' && message.id === 'console-test') {
                  console.log('❌ Bridge error:');
                  console.log(message.error);
                  window.removeEventListener('message', messageHandler);
                  bridgeTestComplete = true;
                }
              };

              window.addEventListener('message', messageHandler);

              console.log('Sending detection request via bridge...');
              window.postMessage(
                {
                  type: 'nano:detect',
                  id: 'console-test',
                },
                window.location.origin,
              );

              // Timeout check
              setTimeout(() => {
                if (!bridgeTestComplete) {
                  console.log('⚠️ Bridge test timeout - extension may not be loaded');
                  console.log('Make sure the extension is loaded and the page is refreshed');
                  window.removeEventListener('message', messageHandler);
                }
              }, 5000);
            });
          })
          .catch(error => {
            console.log('❌ Text generation failed:');
            console.log(error);
          });
      } else {
        console.log(`⚠️ API status is: ${status}`);
        console.log('The model may still be downloading. Check chrome://components/');
      }
    })
    .catch(error => {
      console.log('❌ Failed to check API status:');
      console.log(error);
    });
} else {
  console.log('❌ Cannot check status - API not available');
}

console.log('\n---');
console.log('Waiting for async tests to complete...');
console.log('Check the console output above for results.');
