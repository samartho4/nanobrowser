# Multimodal Quick Reference

**TL;DR** - Send images and audio to AI models with 3 lines of code.

## Installation

Already included! Just import:

```typescript
import {
  fileToGenerativePart,
  buildMultimodalContent,
  SUPPORTED_MEDIA_TYPES,
} from '@extension/llm/utils/multimodal';
import { HybridAIClient } from '@extension/llm/HybridAIClient';
```

## 30-Second Example

```typescript
// Convert image file to part
const imagePart = await fileToGenerativePart(imageFile);

// Build content
const content = buildMultimodalContent('Analyze:', imagePart);

// Send to AI
const response = await client.invoke({ content });
```

## Common Patterns

### Image Analysis
```typescript
const part = await fileToGenerativePart(imageFile);
const result = await client.invoke({
  content: buildMultimodalContent('What is this?', part),
});
```

### Audio Transcription
```typescript
const part = await fileToGenerativePart(audioFile);
const result = await client.invoke({
  content: buildMultimodalContent('Transcribe:', part),
});
```

### Multiple Images
```typescript
const img1 = await fileToGenerativePart(file1);
const img2 = await fileToGenerativePart(file2);

const result = await client.invoke({
  content: buildMultimodalContent('Compare:', img1, 'and', img2),
});
```

### With System Prompt
```typescript
const part = await fileToGenerativePart(imageFile);
const result = await client.invoke({
  content: buildMultimodalContent('Analyze:', part),
  system: 'Expert at image analysis. Be concise.',
});
```

### With Schema (Structured Output)
```typescript
const part = await fileToGenerativePart(imageFile);
const result = await client.invoke({
  content: buildMultimodalContent('Extract data:', part),
  schema: {
    type: 'object',
    properties: {
      items: { type: 'array', items: { type: 'string' } },
    },
  },
});
```

### Error Handling
```typescript
import { MultimodalError } from '@extension/llm/utils/multimodal';

try {
  const part = await fileToGenerativePart(file);
  const result = await client.invoke({ content: [part] });
} catch (error) {
  if (error instanceof MultimodalError) {
    console.error('Validation error:', error.message);
  }
}
```

## Supported Types

| Media | Types | Max Size |
|-------|-------|----------|
| **Image** | JPEG, PNG, WebP, GIF | 5 MB |
| **Audio** | MP3, WAV, OGG, MPEG | 10 MB |

## API Cheat Sheet

```typescript
// File → Part
const part = await fileToGenerativePart(file);

// Base64 → Part
const part = createInlineDataPart(base64, 'image/png');

// Mixed content
const content = buildMultimodalContent(
  'Text',        // Auto-converted to TextPart
  imagePart,     // InlineDataPart
  'More text'    // Auto-converted
);

// Invoke
const result = await client.invoke({
  content,
  system?: 'System message',
  schema?: { /* JSON schema */ },
  stream?: false,
});
```

## Type Guards

```typescript
import { isValidMimeType, isTextPart, isInlineDataPart } from '@extension/llm/utils/multimodal';

if (isValidMimeType(file.type)) { /* ... */ }
if (isTextPart(part)) { /* ... */ }
if (isInlineDataPart(part)) { /* ... */ }
```

## Common Gotchas

❌ **Don't** mix prompt and content
```typescript
// WRONG
client.invoke({
  prompt: 'text',
  content: [...],
});
```

✅ **Do** use either/or
```typescript
// RIGHT
client.invoke({ content: [...] });
// or
client.invoke({ prompt: 'text' });
```

---

❌ **Don't** send unsupported types
```typescript
// WRONG
const part = await fileToGenerativePart(videoFile); // Throws!
```

✅ **Do** check first
```typescript
// RIGHT
if (isValidMimeType(file.type)) {
  const part = await fileToGenerativePart(file);
}
```

---

❌ **Don't** include data URL prefix in base64
```typescript
// WRONG
const base64 = 'data:image/png;base64,iVBORw...';
const part = createInlineDataPart(base64, 'image/png');
```

✅ **Do** use clean base64
```typescript
// RIGHT
const base64 = 'iVBORw...'; // No prefix!
const part = createInlineDataPart(base64, 'image/png');
```

## Performance Tips

1. **Compress before sending**
   - Large images = slow responses
   - 500KB better than 5MB

2. **Batch similar tasks**
   - Process multiple images at once
   - Reuse system prompt

3. **Use appropriate model**
   - Vision → Cloud
   - Text → Nano (faster, local)

## Limits

- Max 5 MB per image
- Max 10 MB per audio
- Single image/audio per content part
- Multiple parts per invocation ✅

## Testing

```typescript
// Unit tests
pnpm -F chrome-extension test -- multimodal.test.ts

// Integration tests
pnpm -F chrome-extension test -- multimodal.integration.test.ts
```

## Debug Logging

```typescript
// HybridAIClient logs routing decisions
// Check browser console or extension logging

console.log('Provider:', response.provider); // 'nano' | 'cloud'
```

## More Info

- Full guide: `MULTIMODAL.md`
- Implementation details: `MULTIMODAL_IMPLEMENTATION.md`
- Source code: `utils/multimodal.ts`
- Tests: `__tests__/multimodal*.test.ts`
