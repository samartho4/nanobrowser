/**
 * PageCaptureTest Component
 * Provides UI for DOM capture functionality with AI integration and voice input
 */

import { useState, useRef } from 'react';

interface PageCaptureProps {
  onPageCaptured?: (content: string) => void;
  onPromptUpdate?: (prompt: string) => void;
}

export function PageCaptureTest({ onPageCaptured, onPromptUpdate }: PageCaptureProps) {
  const [captureStatus, setCaptureStatus] = useState<'idle' | 'capturing' | 'success' | 'error'>('idle');
  const [capturedContent, setCapturedContent] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiResponse, setAiResponse] = useState('');

  // Speech recognition states
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [speechSupported, setSpeechSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  const captureCurrentPage = async () => {
    setCaptureStatus('capturing');
    setErrorMessage('');
    setCapturedContent('');

    try {
      console.log('[PageCaptureTest] Sending DOM capture request...');

      const response = await chrome.runtime.sendMessage({
        type: 'CAPTURE_CURRENT_PAGE',
        options: {
          includeInteractive: true,
          maxTextLength: 12000,
        },
      });

      console.log('[PageCaptureTest] Received response:', response);

      if (response && response.success) {
        const formattedContent = formatDOMContent(response.content);
        setCapturedContent(formattedContent);
        setCaptureStatus('success');

        if (onPageCaptured) {
          onPageCaptured(formattedContent);
        }

        console.log('[PageCaptureTest] ✅ Page captured successfully');
      } else {
        const error = response?.error || 'Unknown error occurred';
        setErrorMessage(error);
        setCaptureStatus('error');
        console.error('[PageCaptureTest] ❌ Capture failed:', error);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to capture page';
      setErrorMessage(errorMsg);
      setCaptureStatus('error');
      console.error('[PageCaptureTest] ❌ Exception during capture:', error);
    }
  };

  const formatDOMContent = (content: any): string => {
    if (!content) return '';

    const { metadata, content: pageContent, interactive, performance } = content;

    let formatted = '';

    // Page metadata
    formatted += `📄 Page Information:\n`;
    formatted += `• Title: ${metadata.title}\n`;
    formatted += `• URL: ${metadata.url}\n`;
    formatted += `• Type: ${metadata.pageType}\n`;
    formatted += `• Domain: ${metadata.domain}\n\n`;

    // Performance info
    if (performance) {
      formatted += `⚡ Extraction Stats:\n`;
      formatted += `• Text length: ${performance.textLength} chars\n`;
      formatted += `• Elements: ${performance.elementCount}\n`;
      formatted += `• Time: ${performance.extractionTime}ms\n\n`;
    }

    // Main content
    if (pageContent.mainText) {
      formatted += `📝 Main Content:\n${pageContent.mainText}\n\n`;
    }

    // Headings structure
    if (pageContent.headings && pageContent.headings.length > 0) {
      formatted += `🏗️ Page Structure:\n`;
      for (const heading of pageContent.headings.slice(0, 10)) {
        const indent = '  '.repeat(heading.level - 1);
        formatted += `${indent}${heading.level}. ${heading.text}\n`;
      }
      formatted += '\n';
    }

    // Interactive elements
    if (interactive.buttons && interactive.buttons.length > 0) {
      formatted += `🔘 Buttons: ${interactive.buttons
        .slice(0, 5)
        .map((b: any) => b.text)
        .join(', ')}\n`;
    }

    if (interactive.links && interactive.links.length > 0) {
      formatted += `🔗 Links: ${interactive.links
        .slice(0, 5)
        .map((l: any) => l.text)
        .join(', ')}\n`;
    }

    return formatted.trim();
  };

  const handlePromptChange = (value: string) => {
    setPrompt(value);
    if (onPromptUpdate) {
      onPromptUpdate(value);
    }
  };

  const getAIAnswer = async () => {
    if (!capturedContent || !prompt.trim()) {
      setErrorMessage('Please capture a page and enter a prompt first');
      return;
    }

    setIsProcessing(true);
    setAiResponse('');
    setErrorMessage('');

    try {
      console.log('[PageCaptureTest] Sending AI request with prompt:', prompt);

      // Properly encode content to base64 (handles UTF-8)
      const encodedContent = btoa(unescape(encodeURIComponent(capturedContent)));

      // Send TEST_MULTIMODAL request which the background can handle
      const response = await new Promise<any>((resolve, reject) => {
        chrome.runtime.sendMessage(
          {
            type: 'TEST_MULTIMODAL',
            payload: {
              fileType: 'text',
              mimeType: 'text/plain',
              base64: encodedContent,
              prompt: `Based on the webpage content below, please answer: ${prompt}`,
              fileName: 'page_capture.txt',
            },
          },
          (response: unknown) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(response);
            }
          },
        );
      });

      console.log('[PageCaptureTest] Received response:', response);

      // Handle response
      if (response && response.ok && response.text) {
        setAiResponse(response.text);
      } else if (response && response.data) {
        // If response has data structure, extract the answer
        const answer = response.data?.answer || response.data?.text || JSON.stringify(response.data);
        setAiResponse(answer);
      } else if (response && typeof response === 'string') {
        setAiResponse(response);
      } else {
        setErrorMessage(response?.error || 'No response received from AI');
        console.log('[PageCaptureTest] Response structure:', response);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'AI request failed';
      setErrorMessage(errorMsg);
      console.error('[PageCaptureTest] ❌ AI request failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusColor = () => {
    switch (captureStatus) {
      case 'capturing':
        return 'text-blue-600';
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = () => {
    switch (captureStatus) {
      case 'capturing':
        return '🔄';
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      default:
        return '📄';
    }
  };

  const getStatusText = () => {
    switch (captureStatus) {
      case 'capturing':
        return 'Capturing page content...';
      case 'success':
        return 'Page captured successfully!';
      case 'error':
        return `Failed: ${errorMessage}`;
      default:
        return 'Ready to capture current page';
    }
  };

  // Speech Recognition Functions
  const startSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      setErrorMessage('❌ Speech recognition not supported in this browser. Please use Chrome.');
      return;
    }

    try {
      const recognitionInstance = new SpeechRecognition();

      // Configuration
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = 'en-US';
      recognitionInstance.maxAlternatives = 1;

      // Event: Started
      recognitionInstance.onstart = () => {
        setIsListening(true);
        setInterimTranscript('');
      };

      // Event: Results
      recognitionInstance.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcript;
          } else {
            interim += transcript;
          }
        }

        if (interim) {
          setInterimTranscript(interim);
        }

        if (final) {
          const newPrompt = prompt ? `${prompt} ${final}` : final;
          setPrompt(newPrompt);
          handlePromptChange(newPrompt);
          setInterimTranscript('');
        }
      };

      // Event: Error
      recognitionInstance.onerror = (event: any) => {
        let errorMsg = 'Unknown error';

        switch (event.error) {
          case 'no-speech':
            errorMsg = 'No speech detected. Please try again.';
            break;
          case 'audio-capture':
            errorMsg = 'Microphone not accessible.';
            break;
          case 'not-allowed':
            errorMsg = 'Microphone permission denied.';
            break;
          case 'network':
            errorMsg = 'Network error. Check your connection.';
            break;
          default:
            errorMsg = event.error;
        }

        setErrorMessage(`Speech error: ${errorMsg}`);
        setIsListening(false);
        setInterimTranscript('');
      };

      // Event: Ended
      recognitionInstance.onend = () => {
        setIsListening(false);
        setInterimTranscript('');
      };

      recognitionRef.current = recognitionInstance;
      recognitionInstance.start();
    } catch (error) {
      setErrorMessage(
        `Failed to start speech recognition: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      setIsListening(false);
    }
  };

  const stopSpeechRecognition = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      setInterimTranscript('');
    }
  };

  // Continuous listening mode
  const startContinuousListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      setErrorMessage('❌ Speech recognition not supported');
      return;
    }

    try {
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = 'en-US';

      recognitionInstance.onstart = () => {
        setIsListening(true);
      };

      recognitionInstance.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcript;
          } else {
            interim += transcript;
          }
        }

        setInterimTranscript(interim);

        if (final) {
          const currentPrompt = prompt;
          const newPrompt = currentPrompt ? `${currentPrompt} ${final}` : final;
          setPrompt(newPrompt);
          handlePromptChange(newPrompt);

          // Check for stop command
          if (final.toLowerCase().includes('stop listening')) {
            recognitionInstance.stop();
          }
        }
      };

      recognitionInstance.onerror = (event: any) => {
        setErrorMessage(`Speech error: ${event.error}`);
        setIsListening(false);
        setInterimTranscript('');
      };

      recognitionInstance.onend = () => {
        setIsListening(false);
        setInterimTranscript('');
      };

      recognitionRef.current = recognitionInstance;
      recognitionInstance.start();
    } catch (error) {
      setErrorMessage(
        `Failed to start continuous listening: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      setIsListening(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-purple-200 p-4 mb-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-purple-700 mb-2 flex items-center gap-2">
          📄 Page Capture (NEW!)
          <span className="text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded-full">BETA</span>
        </h3>

        {/* Capture Button and Status */}
        <div className="flex items-center gap-4 mb-3">
          <button
            onClick={captureCurrentPage}
            disabled={captureStatus === 'capturing'}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              captureStatus === 'capturing'
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-purple-600 text-white hover:bg-purple-700'
            }`}>
            {captureStatus === 'capturing' ? 'Capturing...' : 'Capture Current Page'}
          </button>

          <div className={`flex items-center gap-2 text-sm ${getStatusColor()}`}>
            <span className="text-lg">{getStatusIcon()}</span>
            <span>{getStatusText()}</span>
          </div>
        </div>

        {/* How it works */}
        <p className="text-xs text-gray-600 mb-3">
          💡 How it works: Captures webpage content, then use speech or type to ask questions about it!
        </p>

        {/* Captured Content Display */}
        {capturedContent && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">📋 Captured Content:</label>
            <textarea
              value={capturedContent}
              readOnly
              className="w-full h-32 p-3 border border-gray-300 rounded-md text-xs font-mono bg-gray-50 resize-none"
              placeholder="Captured page content will appear here..."
            />
          </div>
        )}

        {/* Prompt Input */}
        {capturedContent && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">💬 Ask about this page:</label>

              {/* Speech Recognition Buttons */}
              <div className="flex gap-2">
                {speechSupported && !isListening && (
                  <>
                    <button
                      onClick={startSpeechRecognition}
                      disabled={isProcessing}
                      className="flex items-center gap-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-purple-300 disabled:to-pink-300 text-white px-3 py-1.5 rounded-md text-xs font-semibold transition shadow-sm"
                      title="Speak one phrase to transcribe">
                      <span>🎙️</span>
                      <span>Speak to Type</span>
                    </button>
                    <button
                      onClick={startContinuousListening}
                      disabled={isProcessing}
                      className="flex items-center gap-1 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 disabled:from-indigo-300 disabled:to-purple-300 text-white px-3 py-1.5 rounded-md text-xs font-semibold transition shadow-sm"
                      title="Keep listening continuously (say 'stop listening' to end)">
                      <span>�</span>
                      <span>Continuous</span>
                    </button>
                  </>
                )}

                {isListening && (
                  <button
                    onClick={stopSpeechRecognition}
                    className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-md text-xs font-semibold transition shadow-sm animate-pulse">
                    <span>⏹</span>
                    <span>Stop Listening</span>
                  </button>
                )}

                {!speechSupported && <span className="text-xs text-red-600 font-medium">❌ Speech not supported</span>}
              </div>
            </div>

            {/* Interim Transcript Display */}
            {interimTranscript && (
              <div className="mb-2 p-2 bg-purple-50 border border-purple-200 rounded text-xs text-purple-700 italic">
                <span className="font-semibold">Speaking:</span> {interimTranscript}
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                value={prompt}
                onChange={e => handlePromptChange(e.target.value)}
                className="flex-1 p-3 border border-gray-300 rounded-md text-sm"
                placeholder="e.g., 'What is this page about?' or use 'Speak to Type'"
              />
              <button
                onClick={getAIAnswer}
                disabled={isProcessing || !prompt.trim()}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  isProcessing || !prompt.trim()
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}>
                {isProcessing ? '🤔 Thinking...' : '🤖 Get AI Answer'}
              </button>
            </div>
          </div>
        )}

        {/* AI Response */}
        {aiResponse && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">🤖 AI Response:</label>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-sm">{aiResponse}</div>
          </div>
        )}

        {/* Error Display */}
        {errorMessage && captureStatus === 'error' && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700 text-sm">❌ {errorMessage}</p>
          </div>
        )}
      </div>
    </div>
  );
}
