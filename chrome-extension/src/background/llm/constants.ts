// Message type constant for hybrid SDK invocation
export const HYBRID_SDK_INVOKE = 'HYBRID_SDK_INVOKE';

// Message sent from service worker to side panel for cloud fallback
export interface HybridSDKInvokeMessage {
  type: typeof HYBRID_SDK_INVOKE;
  payload: {
    prompt: string;
    system?: string;
    schema?: any;
    stream?: boolean;
  };
}

// Response from side panel back to service worker
export interface HybridSDKResponse {
  ok: boolean;
  provider?: 'cloud';
  text?: string;
  error?: string;
}
