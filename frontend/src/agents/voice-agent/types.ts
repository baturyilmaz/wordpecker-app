export interface VoiceAgentConfig {
  listId: string;
  listName: string;
  listContext?: string;
  userLanguages: {
    baseLanguage: string;
    targetLanguage: string;
  };
}

export interface ConversationMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export type VoiceAgentStatus = 
  | 'idle'           // Not connected
  | 'connecting'     // Getting token and connecting
  | 'connected'      // Connected and ready
  | 'listening'      // Actively listening for user input
  | 'speaking'       // Agent is speaking
  | 'processing'     // Processing user input or tool calls
  | 'error'          // Error state
  | 'disconnecting'; // Disconnecting

export interface UseVoiceAgentReturn {
  // State
  status: VoiceAgentStatus;
  conversation: ConversationMessage[];
  isConnected: boolean;
  error: string | null;
  
  // Actions
  startConversation: (config: VoiceAgentConfig) => Promise<void>;
  endConversation: () => Promise<void>;
  sendMessage: (message: string) => void;
  interrupt: () => void;
  
  // Utils
  clearError: () => void;
  clearConversation: () => void;
}

export interface VoiceAgentProps {
  config: VoiceAgentConfig;
  isOpen: boolean;
  onClose: () => void;
}

export interface VoiceAgentContextData {
  listId: string;
  listName: string;
  listContext?: string;
}