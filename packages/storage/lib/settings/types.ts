// Agent name, used to identify the agent in the settings
export enum AgentNameEnum {
  Planner = 'planner',
  Navigator = 'navigator',
}

// Provider type - only Google providers are supported
export enum ProviderTypeEnum {
  Gemini = 'gemini',
  GeminiNano = 'gemini-nano',
}

// Default supported models for each built-in provider
export const llmProviderModelNames = {
  [ProviderTypeEnum.Gemini]: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-1.5-flash', 'gemini-1.5-pro'],
  [ProviderTypeEnum.GeminiNano]: ['gemini-nano'],
};

// Default parameters for each agent per provider
export const llmProviderParameters = {
  [ProviderTypeEnum.Gemini]: {
    [AgentNameEnum.Planner]: {
      temperature: 0.7,
      topP: 0.9,
    },
    [AgentNameEnum.Navigator]: {
      temperature: 0.3,
      topP: 0.85,
    },
  },
  [ProviderTypeEnum.GeminiNano]: {
    [AgentNameEnum.Planner]: {
      temperature: 0.7,
      topP: 3, // topK for Nano (1-3)
    },
    [AgentNameEnum.Navigator]: {
      temperature: 0.3,
      topP: 2, // topK for Nano
    },
  },
};
