import { RealtimeAgent, RealtimeSession } from '@openai/agents-realtime';
import { VoiceAgentConfig, VoiceAgentContextData } from './types';
import { createAddWordTool } from './tools';
import { apiService } from '../../services/api';

export class VoiceAgentService {
  private agent: RealtimeAgent | null = null;
  private session: RealtimeSession | null = null;
  private isConnected = false;
  private contextData: VoiceAgentContextData | null = null;
  
  constructor() {
    this.createAgent = this.createAgent.bind(this);
    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this.sendMessage = this.sendMessage.bind(this);
    this.interrupt = this.interrupt.bind(this);
  }

  async createAgent(agentConfig: VoiceAgentConfig): Promise<RealtimeAgent> {
    
    // Store context data for tools
    this.contextData = {
      listId: agentConfig.listId,
      listName: agentConfig.listName,
      listContext: agentConfig.listContext,
    };
    
    // Fetch current words from the list
    let currentWords: string[] = [];
    try {
      const words = await apiService.getWords(agentConfig.listId);
      currentWords = words.map(word => word.value);
    } catch (error) {
      console.error('Failed to fetch words for voice agent:', error);
    }
    
    const contextInfo = agentConfig.listContext 
      ? `The context of this list is: ${agentConfig.listContext}.`
      : '';
    
    const wordsInfo = currentWords.length > 0 
      ? `Current words in the list: ${currentWords.join(', ')}`
      : 'The list is currently empty.';
    
    const instructions = `You are an enthusiastic and highly effective language learning assistant for WordPecker. You're an expert at helping users learn ${agentConfig.userLanguages.targetLanguage} vocabulary.

    **CRITICAL LANGUAGE UNDERSTANDING:**
    - The user speaks ${agentConfig.userLanguages.baseLanguage} as their native/base language
    - The user is learning ${agentConfig.userLanguages.targetLanguage} as their target language
    - ALL vocabulary words in the list are in ${agentConfig.userLanguages.targetLanguage}
    - You should ONLY recommend and add words that are in ${agentConfig.userLanguages.targetLanguage}
    - When explaining meanings, use ${agentConfig.userLanguages.baseLanguage}
    - When creating example sentences, use ${agentConfig.userLanguages.targetLanguage} words in context

    **LIST INFORMATION:**
    - List Name: "${agentConfig.listName}"
    - ${contextInfo}
    - ${wordsInfo} (These are all ${agentConfig.userLanguages.targetLanguage} words)
    - Learning Direction: ${agentConfig.userLanguages.baseLanguage} → ${agentConfig.userLanguages.targetLanguage}

    **YOUR CORE RESPONSIBILITIES:**
    
    1. **${agentConfig.userLanguages.targetLanguage} VOCABULARY PRACTICE:**
       - Help users practice ${agentConfig.userLanguages.targetLanguage} words they already have
       - Use these ${agentConfig.userLanguages.targetLanguage} words naturally in conversations
       - Test their understanding of ${agentConfig.userLanguages.targetLanguage} words
       - Create example sentences using ${agentConfig.userLanguages.targetLanguage} words
       - Ask them to use ${agentConfig.userLanguages.targetLanguage} words in different contexts
       
    2. **${agentConfig.userLanguages.targetLanguage} WORD DISCOVERY:**
       - Recommend new ${agentConfig.userLanguages.targetLanguage} words that fit the list's theme
       - Suggest ${agentConfig.userLanguages.targetLanguage} words that complement their existing vocabulary
       - Always explain WHY a ${agentConfig.userLanguages.targetLanguage} word is relevant to their learning goals
       - Explain meanings in ${agentConfig.userLanguages.baseLanguage} but the word itself must be in ${agentConfig.userLanguages.targetLanguage}
       - Ask permission before adding ${agentConfig.userLanguages.targetLanguage} words to their list
       
    3. **ACTIVE ${agentConfig.userLanguages.targetLanguage} LEARNING CHALLENGES:**
       - Create word games using ${agentConfig.userLanguages.targetLanguage} vocabulary
       - Ask users to make sentences with specific ${agentConfig.userLanguages.targetLanguage} words
       - Give them scenarios where they need to use ${agentConfig.userLanguages.targetLanguage} vocabulary
       - Test their understanding of ${agentConfig.userLanguages.targetLanguage} words through contextual questions
       - Encourage them to explain ${agentConfig.userLanguages.targetLanguage} words back to you
       
    4. **PERSONALIZED ${agentConfig.userLanguages.targetLanguage} LEARNING:**
       - Adapt to their ${agentConfig.userLanguages.targetLanguage} learning pace and style
       - Provide encouragement and celebrate their ${agentConfig.userLanguages.targetLanguage} progress
       - Make ${agentConfig.userLanguages.targetLanguage} learning fun and engaging
       - Connect new ${agentConfig.userLanguages.targetLanguage} words to their interests and the list context
       
    **CONVERSATION STYLE:**
    - Speak primarily in ${agentConfig.userLanguages.baseLanguage} for explanations and conversations
    - Use ${agentConfig.userLanguages.targetLanguage} words from their vocabulary naturally in context
    - When teaching new ${agentConfig.userLanguages.targetLanguage} words, always provide ${agentConfig.userLanguages.baseLanguage} explanations
    - Ask engaging questions to keep them talking
    - Challenge them appropriately to their ${agentConfig.userLanguages.targetLanguage} level
    - Celebrate their ${agentConfig.userLanguages.targetLanguage} victories and progress
    
    **TOOLS AVAILABLE:**
    - add_word_to_list: Use this to add relevant new ${agentConfig.userLanguages.targetLanguage} words when they agree
    
    **IMPORTANT REMINDERS:**
    - NEVER suggest ${agentConfig.userLanguages.baseLanguage} words for their ${agentConfig.userLanguages.targetLanguage} learning list
    - ALWAYS ensure recommended words are in ${agentConfig.userLanguages.targetLanguage}
    - Explain meanings in ${agentConfig.userLanguages.baseLanguage}, but the vocabulary is ${agentConfig.userLanguages.targetLanguage}
    - Create example sentences that showcase ${agentConfig.userLanguages.targetLanguage} words in proper context
    
    Remember: Your goal is to help them master ${agentConfig.userLanguages.targetLanguage} vocabulary through engaging conversations and challenges!`;

    // Create tools with access to context data
    const addWordTool = createAddWordTool(() => this.contextData);

    this.agent = new RealtimeAgent({
      name: 'WordPecker Learning Assistant',
      instructions,
      tools: [addWordTool],
    });

    return this.agent;
  }

  async connect(ephemeralToken: string): Promise<RealtimeSession> {
    if (!this.agent) {
      throw new Error('Agent not created. Call createAgent first.');
    }

    // Ensure any existing session is disconnected first
    if (this.session || this.isConnected) {
      console.log('Disconnecting existing session before creating new one');
      await this.disconnect();
    }

    this.session = new RealtimeSession(this.agent, {
      model: 'gpt-4o-realtime-preview-2024-12-17',
      config: {
        inputAudioTranscription: {
          model: 'whisper-1',
        },
        turnDetection: {
          type: 'semantic_vad',
          eagerness: 'medium',
          createResponse: true,
          interruptResponse: true,
        },
      },
    });

    // Context data is already stored in this.contextData and will be passed to tools

    await this.session.connect({ apiKey: ephemeralToken });
    this.isConnected = true;

    console.log('Voice agent session connected successfully');
    return this.session;
  }

  async disconnect(): Promise<void> {
    console.log('Disconnecting voice agent session...');
    
    if (this.session) {
      try {
        // RealtimeSession may not have a disconnect method, use close or cleanup
        if ('disconnect' in this.session && typeof this.session.disconnect === 'function') {
          await this.session.disconnect();
        } else if ('close' in this.session && typeof this.session.close === 'function') {
          (this.session as any).close();
        }
      } catch (error) {
        console.warn('Error during session disconnect:', error);
      }
      this.session = null;
    }
    
    this.isConnected = false;
    this.contextData = null;
    console.log('Voice agent session disconnected');
  }

  sendMessage(message: string): void {
    if (!this.session || !this.isConnected) {
      throw new Error('Session not connected');
    }
    this.session.sendMessage(message);
  }

  interrupt(): void {
    if (!this.session) {
      throw new Error('Session not available');
    }
    this.session.interrupt();
  }

  getSession(): RealtimeSession | null {
    return this.session;
  }

  isSessionConnected(): boolean {
    return this.isConnected;
  }

  getContextData(): VoiceAgentContextData | null {
    return this.contextData;
  }
}

export const voiceAgentService = new VoiceAgentService();

// Re-export types and hooks for convenience
export type {
  VoiceAgentConfig,
  VoiceAgentStatus,
  ConversationMessage,
  VoiceAgentProps,
  UseVoiceAgentReturn,
  VoiceAgentContextData
} from './types';

export { useVoiceAgent } from './hooks';