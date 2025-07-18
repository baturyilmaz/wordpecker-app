# Voice Agent

A real-time voice-powered learning assistant for WordPecker that helps users practice vocabulary through natural conversation.

## Structure

```
voice-agent/
├── index.ts          # Main service class and exports
├── types.ts          # TypeScript interfaces and types
├── tools.ts          # Agent tools (add words, get progress, etc.)
├── hooks.ts          # React hook for managing agent state
├── component.tsx     # React UI component
├── prompt.md         # Agent instructions and guidelines
└── README.md         # This file
```

## Features

- **Real-time voice conversation** using OpenAI's Realtime API
- **Context-aware learning** based on word list themes
- **Interactive tools** for adding words and tracking progress
- **Text + voice input** for flexible interaction
- **Conversation history** with message bubbles
- **Status indicators** showing agent state

## Usage

```tsx
import { VoiceAgent, useVoiceAgent } from '../agents/voice-agent';

// In a component
const { isOpen, onOpen, onClose } = useDisclosure();

<VoiceAgent
  config={{
    listId: 'list-123',
    listName: 'Travel Vocabulary',
    listContext: 'Travel and tourism',
    userLanguages: {
      baseLanguage: 'English',
      targetLanguage: 'Spanish'
    }
  }}
  isOpen={isOpen}
  onClose={onClose}
/>
```

## Available Tools

1. **add_word_to_list**: Adds new vocabulary words to the current list
2. **search_word_definition**: Helps users understand word meanings
3. **get_learning_progress**: Shows current learning progress and statistics

## Agent Behavior

The voice agent is designed to:
- Engage users in natural conversation using their vocabulary words
- Recommend relevant new words based on list context
- Provide encouragement and celebrate learning progress
- Ask before making changes to word lists
- Adapt to user's language proficiency level