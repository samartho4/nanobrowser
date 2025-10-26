/**
 * DOM Capture Handler
 * Handles CAPTURE_CURRENT_PAGE messages from the side panel
 * Extracts DOM content from active tabs and returns formatted content
 */

import { createLogger } from '../log';

const logger = createLogger('dom-capture-handler');

export interface CaptureOptions {
  includeInteractive?: boolean;
  maxTextLength?: number;
}

export interface CaptureResponse {
  success: boolean;
  content?: any;
  error?: string;
}

/**
 * Ensures the content script is injected into the target tab
 */
async function ensureContentScriptInjected(tabId: number): Promise<boolean> {
  try {
    logger.info(`Ensuring content script is injected in tab ${tabId}`);

    // Try to send a ping message to check if content script exists
    try {
      await chrome.tabs.sendMessage(tabId, { type: 'PING_CONTENT_SCRIPT' });
      logger.info(`Content script already exists in tab ${tabId}`);
      return true;
    } catch (e) {
      // Content script not present, inject it
      logger.info(`Injecting content script into tab ${tabId}`);
    }

    // Get the content script file from the built extension
    const contentScriptPath = 'content/index.iife.js';

    // Use chrome.scripting to inject the script
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: [contentScriptPath],
      });
      logger.info(`Successfully injected content script into tab ${tabId}`);

      // Wait a bit for the script to initialize
      await new Promise(resolve => setTimeout(resolve, 100));
      return true;
    } catch (injectionError) {
      logger.error(`Failed to inject content script via chrome.scripting:`, injectionError);

      // Fallback: try with executeScript (older API)
      try {
        const [result] = (await chrome.tabs.executeScript(tabId, {
          file: contentScriptPath,
        })) as any[];
        logger.info(`Fallback injection successful in tab ${tabId}`);
        return true;
      } catch (fallbackError) {
        logger.error(`Fallback injection also failed:`, fallbackError);
        return false;
      }
    }
  } catch (error) {
    logger.error(`Error ensuring content script injection:`, error);
    return false;
  }
}

/**
 * Gets the active tab and captures its DOM
 */
export async function captureCurrentPage(options: CaptureOptions = {}): Promise<CaptureResponse> {
  try {
    logger.info('Capture current page request received', options);

    // Get the active tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs.length || !tabs[0].id) {
      return {
        success: false,
        error: 'No active tab found',
      };
    }

    const tabId = tabs[0].id;
    const tab = tabs[0];

    logger.info(`Active tab: ${tab.url} (ID: ${tabId})`);

    // Check if tab is accessible (not chrome://, data:, etc.)
    if (!tab.url || !tab.url.startsWith('http')) {
      return {
        success: false,
        error: 'Cannot capture from this tab - only HTTP/HTTPS pages are supported',
      };
    }

    // Ensure content script is injected
    const injected = await ensureContentScriptInjected(tabId);
    if (!injected) {
      return {
        success: false,
        error: 'Failed to inject content script into the page',
      };
    }

    // Send capture request to content script
    logger.info(`Sending extraction request to tab ${tabId}`);

    try {
      const response = await chrome.tabs.sendMessage(tabId, {
        type: 'EXTRACT_PAGE_CONTENT',
        options: {
          includeInteractive: options.includeInteractive ?? true,
          maxTextLength: options.maxTextLength ?? 12000,
        },
      });

      if (response && response.success) {
        logger.info('Successfully extracted page content', {
          contentLength: JSON.stringify(response.content).length,
          metadata: response.content?.metadata,
        });

        return {
          success: true,
          content: response.content,
        };
      } else {
        const error = response?.error || 'Unknown error from content script';
        logger.error('Content script returned error:', error);
        return {
          success: false,
          error,
        };
      }
    } catch (messageError) {
      logger.error('Failed to send message to content script:', messageError);
      return {
        success: false,
        error: `Failed to communicate with page: ${messageError instanceof Error ? messageError.message : 'Unknown error'}`,
      };
    }
  } catch (error) {
    logger.error('Unexpected error in captureCurrentPage:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}

/**
 * Handles DOM capture messages from the side panel
 */
export async function handleDOMCaptureMessage(
  message: any,
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response: any) => void,
): Promise<void> {
  if (message.type !== 'CAPTURE_CURRENT_PAGE') {
    return; // Not our message type
  }

  try {
    logger.info('Processing CAPTURE_CURRENT_PAGE message');

    const response = await captureCurrentPage(message.options || {});
    sendResponse(response);
  } catch (error) {
    logger.error('Error handling DOM capture message:', error);
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
