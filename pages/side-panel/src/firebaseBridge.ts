/**
 * Firebase AI Logic SDK Bridge
 *
 * This module runs in the side panel page context and provides cloud fallback
 * for AI inference when Gemini Nano is unavailable in the service worker.
 *
 * It uses Firebase AI Logic SDK with InferenceMode.PREFER_ON_DEVICE to attempt
 * on-device inference first, then fallback to cloud (Gemini 1.5 Flash).
 */

import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAI, getGenerativeModel, GoogleAIBackend, InferenceMode, Schema } from 'firebase/ai';
import { HYBRID_SDK_INVOKE, type HybridSDKResponse } from '../../../chrome-extension/src/background/llm/constants';

// Firebase configuration will be loaded from extension storage
let firebaseApp: FirebaseApp | null = null;
let ai: any = null;
let baseModel: any = null;
let isInitialized = false;

/**
 * Initialize Firebase AI Logic SDK
 * Loads config from extension storage and sets up the AI instance
 */
async function initializeFirebase(): Promise<void> {
  if (isInitialized) return;

  try {
    // Load Gemini API key from Chrome storage
    const storageData = await chrome.storage.local.get('llm-api-keys');
    const providers = storageData['llm-api-keys']?.providers || {};
    const geminiProvider = providers['gemini'];
    const apiKey = geminiProvider?.apiKey || '';

    if (!apiKey) {
      throw new Error('Gemini API key not configured. Please add it in the Options page.');
    }

    console.log('[FirebaseBridge] Loaded API key from storage');

    // Firebase config - using real Firebase project values
    const firebaseConfig = {
      apiKey: apiKey,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'shannon-2b338',
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'shannon-2b338.firebaseapp.com',
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'shannon-2b338.firebasestorage.app',
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '318348906255',
      appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:318348906255:web:f45a5912987e59215f87a',
    };

    // Initialize Firebase app
    firebaseApp = initializeApp(firebaseConfig);

    // Initialize AI with GoogleAIBackend
    ai = getAI(firebaseApp, { backend: new GoogleAIBackend() });

    // Create base model with PREFER_ON_DEVICE mode
    // Note: model name must be inside inCloudParams, not at top level
    baseModel = getGenerativeModel(ai, {
      mode: InferenceMode.PREFER_ON_DEVICE,
      inCloudParams: {
        model: 'gemini-1.5-flash',
      },
    });

    isInitialized = true;
    console.log('[FirebaseBridge] Initialized successfully');
  } catch (error) {
    console.error('[FirebaseBridge] Initialization failed:', error);
    throw error;
  }
}

// Initialize on module load
initializeFirebase().catch(console.error);

/**
 * Convert a property schema to Firebase Schema format
 * Handles recursive conversion for nested objects and arrays
 */
function convertPropertySchema(propSchema: any): any {
  if (!propSchema || !propSchema.type) {
    return Schema.string(); // Default fallback
  }

  switch (propSchema.type) {
    case 'string':
      return Schema.string();
    case 'number':
    case 'integer':
      return Schema.number();
    case 'boolean':
      return Schema.boolean();
    case 'array':
      if (propSchema.items) {
        return Schema.array({ items: convertPropertySchema(propSchema.items) });
      }
      return Schema.array({ items: Schema.string() });
    case 'object':
      return convertToFirebaseSchema(propSchema);
    default:
      console.warn(`[FirebaseBridge] Unknown property type: ${propSchema.type}`);
      return Schema.string();
  }
}

/**
 * Create a concise schema description for the prompt
 * Instead of including the full JSON schema, describe the expected structure
 */
function createSchemaDescription(jsonSchema: any): string {
  if (!jsonSchema || typeof jsonSchema !== 'object') {
    return 'The response should be a valid JSON object.';
  }

  // Handle object schemas
  if (jsonSchema.type === 'object' && jsonSchema.properties) {
    const props = jsonSchema.properties;
    const required = jsonSchema.required || [];

    // Special handling for action schemas (detect by presence of 'action' field with many properties)
    if (props.action && props.action.type === 'array') {
      return 'The response must have: {"current_state": {"evaluation_previous_goal": string, "memory": string, "next_goal": string}, "action": [array of action objects]}. Each action object should have ONE action name as key with its parameters as value. All string values must be properly escaped JSON strings.';
    }

    // Special handling for planner schemas
    if (props.observation && props.challenges && props.next_steps) {
      return 'The response must be a JSON object with string fields: observation, challenges, done (boolean), next_steps, final_answer, reasoning, web_task (boolean). All text fields must be strings, not arrays.';
    }

    // General object description
    const propDescriptions: string[] = [];
    for (const [key, value] of Object.entries(props)) {
      const isRequired = required.includes(key);
      const typeInfo = getTypeDescription(value);
      propDescriptions.push(`"${key}": ${typeInfo}${isRequired ? ' (required)' : ' (optional)'}`);
    }

    return `The response must be a JSON object with: {${propDescriptions.join(', ')}}. All string values must be properly escaped.`;
  }

  // Handle array schemas
  if (jsonSchema.type === 'array') {
    const itemType = jsonSchema.items ? getTypeDescription(jsonSchema.items) : 'any';
    return `The response must be a JSON array of ${itemType}`;
  }

  return 'The response should be a valid JSON object.';
}

/**
 * Get a simple type description for a schema property
 */
function getTypeDescription(schema: any): string {
  if (!schema || !schema.type) return 'any';

  if (schema.type === 'object') {
    return 'object';
  }
  if (schema.type === 'array') {
    const itemType = schema.items ? getTypeDescription(schema.items) : 'any';
    return `array of ${itemType}`;
  }
  return schema.type;
}

/**
 * Simplify schema to reduce complexity for cloud API
 * Limits properties to prevent JSON truncation issues
 */
function simplifySchema(jsonSchema: any): any {
  if (!jsonSchema || typeof jsonSchema !== 'object') {
    return jsonSchema;
  }

  // If it's an object schema with many properties, limit them
  if (jsonSchema.type === 'object' && jsonSchema.properties) {
    const props = jsonSchema.properties;
    const propKeys = Object.keys(props);

    // If we have more than 8 properties, keep only the most important ones
    if (propKeys.length > 8) {
      console.log(`[FirebaseBridge] Simplifying schema: ${propKeys.length} properties -> 8`);

      // Keep first 8 properties (usually the most important)
      const limitedProps: Record<string, any> = {};
      for (let i = 0; i < Math.min(8, propKeys.length); i++) {
        const key = propKeys[i];
        limitedProps[key] = props[key];
      }

      return {
        ...jsonSchema,
        properties: limitedProps,
        required: (jsonSchema.required || []).filter((k: string) => k in limitedProps),
      };
    }
  }

  // Recursively simplify nested objects
  if (jsonSchema.properties) {
    const simplifiedProps: Record<string, any> = {};
    for (const [key, value] of Object.entries(jsonSchema.properties)) {
      simplifiedProps[key] = simplifySchema(value);
    }
    return {
      ...jsonSchema,
      properties: simplifiedProps,
    };
  }

  // Simplify array items
  if (jsonSchema.type === 'array' && jsonSchema.items) {
    return {
      ...jsonSchema,
      items: simplifySchema(jsonSchema.items),
    };
  }

  return jsonSchema;
}

/**
 * Convert JSON Schema to Firebase Schema format
 * Handles the required field to compute optionalProperties
 *
 * @param jsonSchema - JSON Schema object
 * @returns Firebase Schema object
 */
function convertToFirebaseSchema(jsonSchema: any): any {
  if (!jsonSchema) {
    return Schema.object({ properties: {} });
  }

  // Simplify schema first to prevent truncation
  const simplified = simplifySchema(jsonSchema);

  if (simplified.type === 'object' && simplified.properties) {
    const props: Record<string, any> = {};
    const required = simplified.required || [];

    // Convert each property
    for (const [key, value] of Object.entries(simplified.properties)) {
      props[key] = convertPropertySchema(value);
    }

    // Compute optional properties (those not in required array)
    const optionalProps = Object.keys(props).filter(k => !required.includes(k));

    // Build Firebase Schema object
    const schemaConfig: any = {
      properties: props,
    };

    if (optionalProps.length > 0) {
      schemaConfig.optionalProperties = optionalProps;
    }

    return Schema.object(schemaConfig);
  }

  // Handle array at root level
  if (simplified.type === 'array' && simplified.items) {
    return Schema.array({ items: convertPropertySchema(simplified.items) });
  }

  // Fallback for other types
  return convertPropertySchema(simplified);
}

/**
 * Collect streaming response chunks into a single string
 *
 * @param streamResp - Streaming response from Firebase SDK
 * @returns Aggregated text content
 */
async function collectStream(streamResp: any): Promise<string> {
  let output = '';
  try {
    for await (const chunk of streamResp.stream) {
      const chunkText = chunk.text();
      if (chunkText) {
        output += chunkText;
      }
    }
  } catch (error) {
    console.error('[FirebaseBridge] Stream collection error:', error);
    throw error;
  }
  return output;
}

/**
 * Message listener for HYBRID_SDK_INVOKE requests from service worker
 * Handles cloud fallback when Gemini Nano is unavailable
 */
chrome.runtime.onMessage.addListener((msg: any, _sender, sendResponse) => {
  // Only handle HYBRID_SDK_INVOKE messages
  if (msg?.type !== HYBRID_SDK_INVOKE) {
    return false;
  }

  // Handle async processing
  (async () => {
    try {
      // Ensure Firebase is initialized
      if (!isInitialized || !ai || !baseModel) {
        await initializeFirebase();
      }

      // Extract payload
      const { prompt, system, schema, stream } = msg.payload;

      // Build parts array
      const parts: Array<{ text: string }> = [];
      if (system) {
        parts.push({ text: system });
      }

      // For complex schemas, use prompt-based JSON instructions instead of structured output
      // This avoids truncation issues with Firebase AI Logic SDK
      let finalPrompt = prompt;
      let schemaDescription = '';

      if (schema) {
        console.log('[FirebaseBridge] Using prompt-based JSON generation (no structured output)');

        // Simplify schema for the prompt
        const simplifiedSchema = simplifySchema(schema);

        // Create a more concise schema description
        schemaDescription = createSchemaDescription(simplifiedSchema);

        // Add JSON instruction to the prompt with concise schema
        finalPrompt = `${prompt}\n\nYou MUST respond with ONLY valid JSON. ${schemaDescription}\n\nRespond with valid JSON only:`;
      }

      // Check total prompt size and truncate if needed to avoid QuotaExceededError
      const totalSize = (system?.length || 0) + finalPrompt.length;
      const MAX_PROMPT_SIZE = 30000; // Conservative limit for Gemini API

      if (totalSize > MAX_PROMPT_SIZE) {
        console.warn(`[FirebaseBridge] Prompt too large (${totalSize} chars), truncating to ${MAX_PROMPT_SIZE}`);

        // Calculate how much we need to truncate
        const systemSize = system?.length || 0;
        const availableForPrompt = MAX_PROMPT_SIZE - systemSize - (schemaDescription.length + 200); // Reserve space for schema

        if (availableForPrompt > 1000) {
          // Truncate the middle of the prompt, keeping beginning and end
          const keepStart = Math.floor(availableForPrompt * 0.3);
          const keepEnd = Math.floor(availableForPrompt * 0.3);
          const truncatedPrompt =
            prompt.substring(0, keepStart) +
            `\n\n[... ${prompt.length - keepStart - keepEnd} characters truncated ...]\n\n` +
            prompt.substring(prompt.length - keepEnd);

          finalPrompt = schema
            ? `${truncatedPrompt}\n\nYou MUST respond with ONLY valid JSON. ${schemaDescription}\n\nRespond with valid JSON only:`
            : truncatedPrompt;
        } else {
          console.error('[FirebaseBridge] Prompt still too large after truncation attempt');
        }
      }

      parts.push({ text: finalPrompt });

      // Use base model without structured output constraints
      // This allows the model to generate complete responses without truncation
      const modelToUse = baseModel;

      // Generate content based on streaming preference
      let text: string;
      if (stream) {
        console.log('[FirebaseBridge] Generating streaming content');
        const streamResp = await modelToUse.generateContentStream(parts);
        text = await collectStream(streamResp);
      } else {
        console.log('[FirebaseBridge] Generating non-streaming content');
        const response = await modelToUse.generateContent(parts);
        text = response.response.text();
      }

      // Clean up the response if we requested JSON
      if (schema) {
        console.log('[FirebaseBridge] Raw response (first 500 chars):', text.substring(0, 500));

        // Extract JSON from markdown code blocks if present
        const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\}|\[[\s\S]*?\])\s*```/);
        if (jsonMatch) {
          text = jsonMatch[1];
          console.log('[FirebaseBridge] Extracted JSON from code block');
        }

        // Remove any leading/trailing whitespace or text
        text = text.trim();

        // If response starts with text before JSON, try to extract just the JSON
        if (!text.startsWith('{') && !text.startsWith('[')) {
          const jsonStart = text.search(/[\{\[]/);
          if (jsonStart !== -1) {
            text = text.substring(jsonStart);
            console.log('[FirebaseBridge] Extracted JSON from mixed response');
          }
        }

        // Try to fix common JSON issues
        try {
          // First attempt: parse as-is
          JSON.parse(text);
          console.log('[FirebaseBridge] Valid JSON response, length:', text.length);
        } catch (e) {
          console.warn('[FirebaseBridge] Initial JSON parse failed, attempting repairs:', e);

          // Attempt 1: Check for multiple JSON objects (common error)
          // Pattern: }{ indicates two separate objects
          if (text.includes('}{')) {
            console.log('[FirebaseBridge] Detected multiple JSON objects, extracting first');
            const firstObjectEnd = text.indexOf('}{') + 1;
            const firstObject = text.substring(0, firstObjectEnd);
            try {
              JSON.parse(firstObject);
              text = firstObject;
              console.log('[FirebaseBridge] Fixed by extracting first JSON object');
            } catch (e2) {
              // Continue to next repair attempt
            }
          }

          // Attempt 2: Fix truncated JSON by finding last complete object
          if (!text.endsWith('}') && !text.endsWith(']')) {
            const lastBrace = text.lastIndexOf('}');
            const lastBracket = text.lastIndexOf(']');
            const lastValid = Math.max(lastBrace, lastBracket);

            if (lastValid > 0) {
              const truncated = text.substring(0, lastValid + 1);
              try {
                JSON.parse(truncated);
                text = truncated;
                console.log('[FirebaseBridge] Fixed truncated JSON');
              } catch (e2) {
                // Continue to next repair attempt
              }
            }
          }

          // Attempt 3: Try to parse again after repairs
          try {
            JSON.parse(text);
            console.log('[FirebaseBridge] Valid JSON after repair, length:', text.length);
          } catch (e3) {
            console.error('[FirebaseBridge] Could not repair JSON:', e3);
            console.error('[FirebaseBridge] Final text (first 1000 chars):', text.substring(0, 1000));
          }
        }
      }

      console.log('[FirebaseBridge] Final response length:', text.length);

      // Return success response
      sendResponse({
        ok: true,
        provider: 'cloud',
        text,
      } as HybridSDKResponse);
    } catch (error) {
      console.error('[FirebaseBridge] Generation failed:', error);
      sendResponse({
        ok: false,
        error: String(error),
      } as HybridSDKResponse);
    }
  })();

  // Return true to indicate async response
  return true;
});

console.log('[FirebaseBridge] Message listener registered');
