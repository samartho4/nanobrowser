# Task Implementation Plan Fixes

## Issues Identified and Fixed

### 1. ✅ Step 4.4 - Complete Schema Conversion Specification

**Issue:** Incomplete schema conversion details - missing critical Firebase Schema API signatures.

**Fixed:** Added complete implementation details:
- `Schema.object({ properties: {...}, optionalProperties: [...] })` signature
- `Schema.array({ items: ... })` signature
- Handling of `required` field from JSON Schema to compute `optionalProperties`
- Complete example implementation of `convertToFirebaseSchema()`
- Complete example implementation of `convertPropertySchema()`
- JSON Schema validation details (additionalProperties, required array)

### 2. ✅ Step 3.2 - Nano Structured Output Clarification

**Issue:** Missing clarification about how Nano handles structured output.

**Fixed:** Added note explaining:
> "Note: This LangChain wrapper internally passes the schema as `responseConstraint` to Prompt API's `session.prompt()`"

### 3. ✅ Step 4.4 - Model Recreation Overhead Documentation

**Issue:** Plan creates new model instance for each schema without documenting performance implications.

**Fixed:** Added explicit note:
> "Note: This creates a new model instance per request with schema (document performance implications)"

### 4. ✅ Step 4.4 - JSON Schema Validation Details

**Issue:** Missing specification of how JSON Schema features map to Firebase Schema.

**Fixed:** Added section:
- `additionalProperties: false` in JSON Schema to prevent extra fields
- `required` array to mark mandatory fields
- These map to Firebase Schema's `properties` and `optionalProperties` structure

### 5. ✅ Step 4.4 - Parts Construction Details

**Issue:** Parts construction was incomplete.

**Fixed:** Explicitly specified:
- Build parts array: `[{ text: system }, { text: prompt }]`
- Note: Future consideration for multimodal inputs (images, audio)

## What Was Already Correct ✅

- Using `responseConstraint` for Nano (via LangChain wrapper)
- Using both `inCloudParams` and `onDeviceParams` for hybrid mode
- `responseMimeType: 'application/json'` for cloud
- Separate helpers for schema conversion
- `GoogleAIBackend` initialization
- `InferenceMode.PREFER_ON_DEVICE` usage

## Implementation Readiness

The tasks document is now ready for implementation with:
1. Complete schema conversion specifications
2. Proper API signatures for Firebase Schema
3. Clear handling of required vs optional properties
4. Performance considerations documented
5. JSON Schema to Firebase Schema mapping clarified

All critical details are now specified for step 4.4, which was the most complex part of the Firebase bridge implementation.
