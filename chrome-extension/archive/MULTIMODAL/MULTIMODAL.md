# Multimodal Support in Nanobrowser

Multimodal prompting allows the HybridAIClient to process images and audio in addition to text. This enables vision-based tasks (image analysis) and transcription capabilities.

## Overview

- **Minimal & Scalable**: Only image and audio support (not video)
- **Firebase SDK Compatible**: Follows Firebase AI Logic documentation
- **Type-Safe**: Full TypeScript support with type guards
- **Error Resistant**: Comprehensive validation and error messages
- **No Breaking Changes**: Backward compatible with text-only prompts

## Supported Media Types

### Images
- `image/jpeg` - JPEG images
- `image/png` - PNG images
- `image/webp` - WebP images
- `image/gif` - GIF images

**Max Size**: 5 MB per image

### Audio
- `audio/mp3` - MP3 audio
- `audio/wav` - WAV audio
- `audio/ogg` - OGG audio
- `audio/mpeg` - MPEG audio

**Max Size**: 10 MB per audio file

## Quick Start

### Converting a File to Multimodal Content

```typescript
import {
  fileToGenerativePart,
  buildMultimodalContent,
} from '@extension/llm/utils/multimodal';

// Convert image file to generative part
const imageFile = fileInputElement.files[0]; // user-selected image
const imagePart = await fileToGenerativePart(imageFile);

// Build multimodal content (mix text and media)
const content = buildMultimodalContent(
  'Describe the contents of this image:',
  imagePart
);

// Invoke with HybridAIClient
const response = await hybridClient.invoke({
  content,
  system: 'You are a helpful assistant skilled at image analysis.',
});

console.log('Analysis:', response.content);
```

### With Audio Transcription

```typescript
const audioFile = audioInputElement.files[0]; // user-selected audio
const audioPart = await fileToGenerativePart(audioFile);

const content = buildMultimodalContent(
  'Transcribe the following audio:',
  audioPart,
  'Provide timestamps for each speaker.'
);

const response = await hybridClient.invoke({
  content,
  system: 'You are an expert transcriber.',
});

console.log('Transcription:', response.content);
```

## API Reference

### Core Functions

#### `fileToGenerativePart(file: File | Blob): Promise<InlineDataPart>`

Converts a File or Blob to a Firebase-compatible InlineDataPart.

**Parameters:**
- `file`: File or Blob object (must be image or audio)

**Returns:** Promise resolving to `InlineDataPart` with base64-encoded data

**Throws:** `MultimodalError` if:
- File type is unsupported
- File exceeds size limit
- Encoding fails

**Example:**
```typescript
const file = inputElement.files[0];
const part = await fileToGenerativePart(file);
// { inlineData: { data: 'base64...', mimeType: 'image/png' } }
```

#### `buildMultimodalContent(...parts): MultimodalContent`

Creates multimodal content from mixed strings and parts.

**Parameters:**
- `...parts`: Variable args of string or MultimodalPart objects

**Returns:** `MultimodalContent` array (strings auto-converted to TextPart)

**Throws:** `MultimodalError` if no parts provided

**Example:**
```typescript
const content = buildMultimodalContent(
  'Image analysis:',
  imagePart,
  'Additional notes?'
);
```

#### `createInlineDataPart(base64Data: string, mimeType: string): InlineDataPart`

Creates an inline data part from raw base64 string.

**Parameters:**
- `base64Data`: Base64-encoded file data (no data URL prefix)
- `mimeType`: Supported MIME type

**Returns:** `InlineDataPart` object

**Throws:** `MultimodalError` if:
- Base64 data is empty
- MIME type unsupported

**Example:**
```typescript
const part = createInlineDataPart(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB...',
  'image/png'
);
```

#### `fileToBase64(file: File | Blob): Promise<string>`

Converts a file to base64-encoded string (without data URL prefix).

**Parameters:**
- `file`: File or Blob object

**Returns:** Promise resolving to base64 string

**Throws:** `MultimodalError` if encoding fails

**Example:**
```typescript
const base64 = await fileToBase64(imageFile);
const part = createInlineDataPart(base64, 'image/png');
```

### Type Guards

#### `isValidMimeType(mimeType: string): boolean`

Checks if MIME type is supported.

```typescript
if (isValidMimeType(file.type)) {
  // Safe to process
  const part = await fileToGenerativePart(file);
}
```

#### `isTextPart(part: unknown): part is TextPart`

Type guard for text parts.

```typescript
if (isTextPart(part)) {
  console.log(part.text);
}
```

#### `isInlineDataPart(part: unknown): part is InlineDataPart`

Type guard for inline data parts.

```typescript
if (isInlineDataPart(part)) {
  console.log(part.inlineData.mimeType);
}
```

### Types

```typescript
// Multimodal content (text or media)
type MultimodalContent = Array<string | MultimodalPart>;

// Text part
interface TextPart {
  text: string;
}

// Inline data part (image/audio)
interface InlineDataPart {
  inlineData: {
    data: string;      // Base64-encoded
    mimeType: SupportedMimeType;
  };
}

// Union of all parts
type MultimodalPart = TextPart | InlineDataPart;

// Extended invoke options
interface InvokeOptions {
  prompt?: string;           // Text prompt (mutually exclusive with content)
  content?: MultimodalContent; // Multimodal content (mutually exclusive with prompt)
  system?: string;
  schema?: any;
  stream?: boolean;
}
```

## Usage Examples

### Example 1: Image Analysis

```typescript
import {
  fileToGenerativePart,
  buildMultimodalContent,
} from '@extension/llm/utils/multimodal';
import { HybridAIClient } from '@extension/llm/HybridAIClient';

async function analyzeImage(imageFile: File) {
  const client = new HybridAIClient();
  
  try {
    // Convert image to part
    const imagePart = await fileToGenerativePart(imageFile);
    
    // Build prompt
    const content = buildMultimodalContent(
      'Analyze this screenshot. What UI elements are visible? List them.',
      imagePart
    );
    
    // Invoke
    const response = await client.invoke({
      content,
      system: 'You are a UI expert. Provide structured analysis.',
    });
    
    return response.content;
  } catch (error) {
    console.error('Analysis failed:', error);
    throw error;
  }
}
```

### Example 2: Vision-Based Navigation

```typescript
async function identifyButton(screenshot: File, buttonName: string) {
  const client = new HybridAIClient();
  
  const imagePart = await fileToGenerativePart(screenshot);
  
  const content = buildMultimodalContent(
    `Find the button labeled "${buttonName}" in this screenshot.`,
    imagePart,
    'Provide the button coordinates (x, y) and describe its appearance.'
  );
  
  const response = await client.invoke({
    content,
    system: 'You are a web automation expert. Return JSON with {x, y, description}.',
    schema: {
      type: 'object',
      properties: {
        x: { type: 'number' },
        y: { type: 'number' },
        description: { type: 'string' },
      },
    },
  });
  
  return JSON.parse(response.content);
}
```

### Example 3: Multi-Image Comparison

```typescript
async function compareImages(image1: File, image2: File) {
  const client = new HybridAIClient();
  
  const part1 = await fileToGenerativePart(image1);
  const part2 = await fileToGenerativePart(image2);
  
  const content = buildMultimodalContent(
    'Compare these two screenshots:',
    part1,
    '---',
    part2,
    'What are the key differences?'
  );
  
  return await client.invoke({ content });
}
```

### Example 4: Fallback Handling

```typescript
async function processMediaSafely(file: File) {
  import { isValidMimeType, MultimodalError } from '@extension/llm/utils/multimodal';
  
  try {
    if (!isValidMimeType(file.type)) {
      throw new Error(`Unsupported file type: ${file.type}`);
    }
    
    const part = await fileToGenerativePart(file);
    const response = await client.invoke({
      content: buildMultimodalContent('Process this:', part),
    });
    
    return response.content;
  } catch (error) {
    if (error instanceof MultimodalError) {
      console.error('Media processing error:', error.message);
      // Fallback: use text-only prompt
      return await client.invoke({
        prompt: 'Could not process image. Please describe what you see.',
      });
    }
    throw error;
  }
}
```

## Limitations

### Current Nano Support
- Nano model (on-device) **does not yet support multimodal**
- Multimodal requests automatically fall back to cloud (Firebase)
- Text extraction from images is not performed on Nano

### Future Enhancements
- [ ] Video support (when Firebase API adds support)
- [ ] Nano multimodal when API becomes available
- [ ] Automatic image optimization/downsampling
- [ ] Streaming multimodal responses

## Error Handling

```typescript
import { MultimodalError } from '@extension/llm/utils/multimodal';

try {
  const part = await fileToGenerativePart(largeFile);
} catch (error) {
  if (error instanceof MultimodalError) {
    // File validation error (type, size, encoding)
    console.error('Validation:', error.message);
  } else {
    // Unexpected error
    console.error('Unexpected:', error);
  }
}
```

**Common Errors:**
- `Unsupported media type: video/mp4` - File type not in supported list
- `File size exceeds limit. Max: 5.0MB for images` - File too large
- `Base64 encoding failed` - File read/encoding issue
- `No text content found in multimodal message` - Nano received media (text extracted but empty)

## Performance Tips

1. **Reduce Image Size**: Large images increase latency
   ```typescript
   // Consider compressing before sending
   const compressed = await compressImage(file);
   const part = await fileToGenerativePart(compressed);
   ```

2. **Batch Similar Tasks**: Process similar images with one system message
   ```typescript
   const content = buildMultimodalContent(
     'Analyze all images:',
     image1Part,
     image2Part,
     'Identify differences.'
   );
   ```

3. **Use Appropriate Models**:
   - Vision tasks → Cloud (Firebase)
   - Text tasks → Nano (faster, local)

## Testing

Run multimodal tests:

```bash
# Unit tests for utilities
pnpm -F chrome-extension test -- -t multimodal

# Integration tests for HybridAIClient
pnpm -F chrome-extension test -- -t "multimodal.integration"
```

## Integration with NavigatorAgent

Vision-based navigation is under development. The NavigatorAgent will:

1. Capture DOM screenshots
2. Pass to HybridAIClient with multimodal support
3. Extract element locations from AI response
4. Execute actions on identified elements

Example (future):
```typescript
// This capability is planned for v2
const screenshot = await browserContext.captureScreenshot();
const actions = await navigatorAgent.identifyElementsInScreenshot(screenshot);
```

## See Also

- [Firebase AI Logic Documentation](https://firebase.google.com/docs/vertex-ai/gemini)
- [Chrome AI Language Model API](https://developer.chrome.com/docs/ai/)
- [HybridAIClient Reference](../HybridAIClient.ts)
- [Executor Reference](../../agent/executor.ts)
