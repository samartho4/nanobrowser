/**
 * Content Script for DOM Extraction
 * This script runs in the context of web pages and extracts their DOM content
 */

console.log('[ContentScript] Loaded and ready');

interface ExtractedContent {
  metadata: {
    title: string;
    url: string;
    pageType: string;
    domain: string;
  };
  content: {
    mainText: string;
    headings: Array<{
      level: number;
      text: string;
    }>;
    links: Array<{
      text: string;
      url: string;
    }>;
  };
  interactive: {
    buttons: string[];
    forms: string[];
  };
  performance: {
    textLength: number;
    elementCount: number;
    extractionTime: number;
  };
}

/**
 * Classify the type of page (article, product, social, etc.)
 */
function classifyPageType(): string {
  const url = window.location.href.toLowerCase();
  const body = document.body.innerText.toLowerCase();

  if (url.includes('amazon.com') || url.includes('ebay.com')) return 'product';
  if (url.includes('twitter.com') || url.includes('x.com') || url.includes('facebook.com')) return 'social';
  if (url.includes('medium.com') || url.includes('substack.com')) return 'article';
  if (url.includes('github.com')) return 'code';
  if (url.includes('youtube.com') || url.includes('vimeo.com')) return 'video';
  if (body.includes('purchase') || body.includes('add to cart')) return 'ecommerce';
  if (body.includes('subscribe') || body.includes('newsletter')) return 'content';

  return 'generic';
}

/**
 * Extract main readable text from page
 */
function extractMainText(maxLength: number = 12000): string {
  const elementsToCheck = [
    document.querySelector('article'),
    document.querySelector('main'),
    document.querySelector('[role="main"]'),
    document.querySelector('.content'),
    document.querySelector('.post'),
    document.body,
  ];

  let text = '';

  for (const element of elementsToCheck) {
    if (element && element instanceof HTMLElement) {
      // Remove script and style elements
      const clone = element.cloneNode(true) as HTMLElement;
      const scripts = clone.querySelectorAll('script, style, noscript');
      scripts.forEach(s => s.remove());

      text = clone.innerText || '';
      if (text.length > 100) break;
    }
  }

  // Clean up whitespace
  text = text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');

  // Truncate if too long
  if (text.length > maxLength) {
    text = text.substring(0, maxLength) + '\n... (truncated)';
  }

  return text;
}

/**
 * Extract all headings with their levels
 */
function extractHeadings(): Array<{ level: number; text: string }> {
  const headings: Array<{ level: number; text: string }> = [];

  for (let i = 1; i <= 6; i++) {
    const elements = document.querySelectorAll(`h${i}`);
    elements.forEach(el => {
      if (el instanceof HTMLElement) {
        const text = el.innerText?.trim();
        if (text && text.length > 0) {
          headings.push({
            level: i,
            text,
          });
        }
      }
    });
  }

  return headings;
}

/**
 * Extract all links
 */
function extractLinks(): Array<{ text: string; url: string }> {
  const links: Array<{ text: string; url: string }> = [];
  const elements = document.querySelectorAll('a[href]');

  elements.forEach(el => {
    if (el instanceof HTMLAnchorElement) {
      const href = el.getAttribute('href');
      const text = el.innerText?.trim();

      if (href && text && text.length > 0) {
        try {
          // Convert relative URLs to absolute
          const url = new URL(href, window.location.href).href;
          links.push({ text, url });
        } catch (e) {
          // Invalid URL, skip
        }
      }
    }
  });

  return links.slice(0, 50); // Limit to 50 links
}

/**
 * Extract interactive elements
 */
function extractInteractive(): { buttons: string[]; forms: string[] } {
  const buttons: string[] = [];
  const forms: string[] = [];

  // Extract button labels
  document.querySelectorAll('button, [role="button"]').forEach(el => {
    if (el instanceof HTMLElement) {
      const text = el.innerText?.trim() || el.getAttribute('aria-label')?.trim();
      if (text && text.length > 0 && text.length < 100) {
        buttons.push(text);
      }
    }
  });

  // Extract form labels
  document.querySelectorAll('form, [role="form"]').forEach((form, idx) => {
    const inputs = form.querySelectorAll('input, textarea, select');
    if (inputs.length > 0) {
      const labels: string[] = [];
      inputs.forEach(input => {
        let label = input.getAttribute('aria-label') || input.getAttribute('placeholder');
        if (!label && input.id) {
          const labelEl = form.querySelector(`label[for="${input.id}"]`);
          if (labelEl && labelEl instanceof HTMLElement) {
            label = labelEl.innerText;
          }
        }
        if (label) labels.push(label);
      });
      if (labels.length > 0) {
        forms.push(`Form ${idx + 1}: ${labels.join(', ')}`);
      }
    }
  });

  return {
    buttons: [...new Set(buttons)].slice(0, 20), // Remove duplicates, limit to 20
    forms: forms.slice(0, 10), // Limit to 10 forms
  };
}

/**
 * Main extraction function
 */
function extractPageContent(options: { includeInteractive?: boolean; maxTextLength?: number } = {}): ExtractedContent {
  const startTime = performance.now();

  const content: ExtractedContent = {
    metadata: {
      title: document.title,
      url: window.location.href,
      pageType: classifyPageType(),
      domain: new URL(window.location.href).hostname,
    },
    content: {
      mainText: extractMainText(options.maxTextLength || 12000),
      headings: extractHeadings(),
      links: extractLinks(),
    },
    interactive: options.includeInteractive ? extractInteractive() : { buttons: [], forms: [] },
    performance: {
      textLength: 0, // Will be set below
      elementCount: document.querySelectorAll('*').length,
      extractionTime: 0, // Will be set below
    },
  };

  content.performance.textLength = content.content.mainText.length;
  content.performance.extractionTime = Math.round(performance.now() - startTime);

  return content;
}

/**
 * Listen for messages from background script
 */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('[ContentScript] Received message:', message.type);

  if (message.type === 'PING_CONTENT_SCRIPT') {
    sendResponse({ success: true, message: 'Content script is active' });
    return true;
  }

  if (message.type === 'EXTRACT_PAGE_CONTENT') {
    try {
      console.log('[ContentScript] Extracting page content...');
      const content = extractPageContent(message.options);
      console.log('[ContentScript] Extraction complete', {
        textLength: content.performance.textLength,
        elementCount: content.performance.elementCount,
        extractionTime: content.performance.extractionTime,
      });
      sendResponse({
        success: true,
        content,
      });
    } catch (error) {
      console.error('[ContentScript] Extraction failed:', error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during extraction',
      });
    }
    return true; // Indicate we'll send response asynchronously
  }

  return false;
});

console.log('[ContentScript] Message listener registered');
