// Voice Agent exports
export { VoiceAgentService, voiceAgentService } from './voice-agent';
export { useVoiceAgent } from './voice-agent/hooks';
export { default as VoiceAgent } from './voice-agent/component';
export type {
  VoiceAgentConfig,
  VoiceAgentStatus,
  ConversationMessage,
  VoiceAgentProps,
  UseVoiceAgentReturn,
  VoiceAgentContextData
} from './voice-agent/types';

// Future agents can be exported here
// export * from './translation-agent';
// export * from './pronunciation-agent';