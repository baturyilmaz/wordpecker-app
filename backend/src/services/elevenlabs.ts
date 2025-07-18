import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getUserLanguages } from '../utils/getUserLanguages';

export interface VoiceConfig {
  id: string;
  name: string;
  language: string;
  category: string;
}

export interface AudioGenerationRequest {
  text: string;
  voice?: string;
  language?: string;
  speed?: number;
  userId?: string; // For automatic language detection from user preferences
}

export interface AudioGenerationResponse {
  audioUrl: string;
  cacheKey: string;
  voice: string;
  duration?: number;
}

export class ElevenLabsService {
  private client: ElevenLabsClient;
  private cacheDir: string;
  private defaultVoices: Record<string, string> = {
    // High-quality multilingual voices - these work well across languages
    'en': 'pNInz6obpgDQGcFmaJgB', // Adam - English
    'tr': 'EXAVITQu4vr4xnSDxMaL', // Sarah - Turkish
    'es': 'XB0fDUnXU5powFXDhCwa', // Maria - Spanish
    'fr': 'ThT5KcBeYPX3keUQqHPh', // Thomas - French
    'de': 'pFZP5JQG7iQjIQuC4Bku', // Klaus - German
    'it': 'XB0fDUnXU5powFXDhCwa', // Maria - Italian (multilingual)
    'pt': 'pNInz6obpgDQGcFmaJgB', // Adam - Portuguese (multilingual)
    'ru': 'EXAVITQu4vr4xnSDxMaL', // Sarah - Russian (multilingual)
    // Asian languages - will be dynamically updated with native voices
    'ja': 'pNInz6obpgDQGcFmaJgB', // Fallback to Adam (multilingual v2 handles Japanese)
    'ko': 'pNInz6obpgDQGcFmaJgB', // Fallback to Adam (multilingual v2 handles Korean)
    'zh': 'pNInz6obpgDQGcFmaJgB', // Fallback to Adam (multilingual v2 handles Chinese)
    'ar': 'pNInz6obpgDQGcFmaJgB', // Fallback to Adam (multilingual v2 handles Arabic)
    'hi': 'pNInz6obpgDQGcFmaJgB', // Fallback to Adam (multilingual v2 handles Hindi)
    'nl': 'pNInz6obpgDQGcFmaJgB', // Fallback to Adam (multilingual v2 handles Dutch)
    'pl': 'pNInz6obpgDQGcFmaJgB', // Fallback to Adam (multilingual v2 handles Polish)
    'sv': 'pNInz6obpgDQGcFmaJgB', // Fallback to Adam (multilingual v2 handles Swedish)
  };

  private nativeVoiceCache: Map<string, string[]> = new Map();
  private lastVoiceCacheUpdate: number = 0;
  private readonly VOICE_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      throw new Error('ELEVENLABS_API_KEY environment variable is required');
    }

    this.client = new ElevenLabsClient({
      apiKey: apiKey,
    });

    // Create cache directory
    this.cacheDir = path.join(process.cwd(), 'audio-cache');
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  /**
   * Generate a cache key for audio content
   */
  private generateCacheKey(text: string, voice: string, speed: number): string {
    const content = `${text}-${voice}-${speed}`;
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * Get cached audio file path
   */
  private getCachedFilePath(cacheKey: string): string {
    return path.join(this.cacheDir, `${cacheKey}.mp3`);
  }

  /**
   * Check if audio is cached
   */
  private isAudioCached(cacheKey: string): boolean {
    const filePath = this.getCachedFilePath(cacheKey);
    return fs.existsSync(filePath);
  }

  /**
   * Get native voices for a specific language from cache or API
   */
  private async getNativeVoicesForLanguage(language: string): Promise<string[]> {
    const now = Date.now();
    
    // Check if we have cached voices and cache is still valid
    if (this.nativeVoiceCache.has(language) && 
        (now - this.lastVoiceCacheUpdate) < this.VOICE_CACHE_TTL) {
      return this.nativeVoiceCache.get(language) || [];
    }

    try {
      // Fetch voices from ElevenLabs API
      const voicesResponse = await this.client.voices.getAll();
      const nativeVoices = voicesResponse.voices
        .filter(voice => {
          const voiceLanguage = voice.labels?.language?.toLowerCase();
          const targetLanguage = language.toLowerCase();
          
          // Match exact language or language family
          return voiceLanguage === targetLanguage ||
                 voiceLanguage === this.getLanguageFamily(targetLanguage) ||
                 (targetLanguage === 'zh' && (voiceLanguage === 'chinese' || voiceLanguage === 'mandarin')) ||
                 (targetLanguage === 'ar' && voiceLanguage === 'arabic') ||
                 (targetLanguage === 'ja' && voiceLanguage === 'japanese') ||
                 (targetLanguage === 'ko' && voiceLanguage === 'korean');
        })
        .map(voice => voice.voiceId)
        .slice(0, 5); // Limit to top 5 voices per language

      // Cache the results
      this.nativeVoiceCache.set(language, nativeVoices);
      this.lastVoiceCacheUpdate = now;
      
      return nativeVoices;
    } catch (error) {
      console.warn(`Failed to fetch native voices for ${language}:`, error);
      return [];
    }
  }

  /**
   * Get language family for better voice matching
   */
  private getLanguageFamily(language: string): string {
    const families: Record<string, string> = {
      'zh': 'chinese',
      'ja': 'japanese', 
      'ko': 'korean',
      'ar': 'arabic',
      'hi': 'hindi',
      'es': 'spanish',
      'fr': 'french',
      'de': 'german',
      'it': 'italian',
      'pt': 'portuguese',
      'ru': 'russian',
      'tr': 'turkish',
      'nl': 'dutch',
      'pl': 'polish',
      'sv': 'swedish'
    };
    return families[language] || language;
  }

  /**
   * Get best voice for language with intelligent fallback
   */
  private async getBestVoiceForLanguage(language: string, requestedVoice?: string): Promise<string> {
    // Use explicitly requested voice if provided
    if (requestedVoice) {
      return requestedVoice;
    }

    // Try to get native voices for the language
    const nativeVoices = await this.getNativeVoicesForLanguage(language);
    if (nativeVoices.length > 0) {
      // Use the first (presumably best) native voice
      return nativeVoices[0];
    }

    // Fallback to default voice for the language
    return this.defaultVoices[language] || this.defaultVoices['en'];
  }

  /**
   * Determine the target language for audio generation
   */
  private async determineTargetLanguage(request: AudioGenerationRequest): Promise<string> {
    // If language is explicitly provided, use it
    if (request.language) {
      return request.language;
    }

    // If userId is provided, try to get their target language preference
    if (request.userId) {
      try {
        const userLanguages = await getUserLanguages(request.userId);
        return userLanguages.targetLanguage;
      } catch (error) {
        console.warn(`Failed to get user languages for ${request.userId}:`, error);
      }
    }

    // Default to English
    return 'en';
  }

  /**
   * Get language-specific audio settings for optimal learning
   */
  private getLanguageLearningSettings(language: string, speed?: number): { speed: number; style: number } {
    // Language-specific pronunciation settings optimized for learning
    const languageSettings: Record<string, { speed: number; style: number }> = {
      'ja': { speed: 0.85, style: 0.2 }, // Slower for Japanese phonetics
      'ko': { speed: 0.85, style: 0.2 }, // Slower for Korean pronunciation
      'zh': { speed: 0.8, style: 0.3 },  // Slower for tonal accuracy
      'ar': { speed: 0.85, style: 0.2 }, // Slower for Arabic sounds
      'hi': { speed: 0.85, style: 0.2 }, // Slower for Hindi pronunciation
      'ru': { speed: 0.9, style: 0.1 },  // Slightly slower for Russian
      'th': { speed: 0.85, style: 0.2 }, // Slower for Thai tones
    };

    const defaults = { speed: speed || 1.0, style: 0.0 };
    const langSettings = languageSettings[language];
    
    if (!langSettings) return defaults;

    return {
      speed: speed || langSettings.speed, // Use custom speed if provided
      style: langSettings.style
    };
  }

  /**
   * Generate audio using ElevenLabs API
   */
  async generateAudio(request: AudioGenerationRequest): Promise<AudioGenerationResponse> {
    const { text, voice: requestedVoice, userId } = request;

    // Determine target language (from user preferences or explicit)
    const language = await this.determineTargetLanguage(request);
    
    // Get language-specific settings
    const audioSettings = this.getLanguageLearningSettings(language, request.speed);

    // Validate input
    if (!text || text.trim().length === 0) {
      throw new Error('Text is required for audio generation');
    }

    if (text.length > 2500) {
      throw new Error('Text is too long. Maximum 2500 characters allowed.');
    }

    // Select best voice for the language
    const voice = await this.getBestVoiceForLanguage(language, requestedVoice);
    
    // Generate cache key including language for better cache management
    const cacheKey = this.generateCacheKey(text, voice, audioSettings.speed);
    const filePath = this.getCachedFilePath(cacheKey);

    // Check cache first
    if (this.isAudioCached(cacheKey)) {
      console.log(`Audio served from cache: ${cacheKey} (${language})`);
      return {
        audioUrl: `/api/audio/cache/${cacheKey}`,
        cacheKey,
        voice,
      };
    }

    try {
      console.log(`Generating ${language} audio: "${text.substring(0, 50)}..." with voice ${voice}`);
      
      // Generate audio using ElevenLabs with language-optimized settings
      const audioResponse = await this.client.textToSpeech.convert(voice, {
        text: text,
        modelId: 'eleven_multilingual_v2', // Supports multiple languages with high quality
        voiceSettings: {
          stability: 0.5,
          similarityBoost: 0.8,
          style: audioSettings.style, // Language-specific style
          useSpeakerBoost: true,
        },
      });

      // Convert response to buffer and save to cache
      const chunks: Uint8Array[] = [];
      const reader = audioResponse.getReader();
      
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      
      const audioBuffer = Buffer.concat(chunks);
      fs.writeFileSync(filePath, audioBuffer);

      console.log(`Audio generated and cached: ${cacheKey} (${language}, ${audioSettings.speed}x speed)`);

      return {
        audioUrl: `/api/audio/cache/${cacheKey}`,
        cacheKey,
        voice,
      };
    } catch (error) {
      console.error('ElevenLabs API error:', error);
      
      if (error instanceof Error) {
        // Handle specific ElevenLabs errors
        if (error.message.includes('quota')) {
          throw new Error('Audio generation quota exceeded. Please try again later.');
        }
        if (error.message.includes('voice')) {
          throw new Error('Selected voice is not available. Using default voice.');
        }
      }
      
      throw new Error('Failed to generate audio. Please try again.');
    }
  }

  /**
   * Get available voices for a language
   */
  async getAvailableVoices(language?: string): Promise<VoiceConfig[]> {
    try {
      const voicesResponse = await this.client.voices.getAll();
      
      return voicesResponse.voices
        .filter((voice) => {
          if (!language) return true;
          // Filter by language if specified
          return voice.labels?.language === language;
        })
        .map((voice) => ({
          id: voice.voiceId,
          name: voice.name || 'Unknown Voice',
          language: voice.labels?.language || 'unknown',
          category: voice.category || 'general',
        }))
        .slice(0, 20); // Limit to 20 voices
    } catch (error) {
      console.error('Error fetching voices:', error);
      return [];
    }
  }

  /**
   * Serve cached audio file
   */
  getCachedAudio(cacheKey: string): Buffer | null {
    const filePath = this.getCachedFilePath(cacheKey);
    
    if (!this.isAudioCached(cacheKey)) {
      return null;
    }

    try {
      return fs.readFileSync(filePath);
    } catch (error) {
      console.error('Error reading cached audio:', error);
      return null;
    }
  }

  /**
   * Clean old cache files (older than 7 days)
   */
  async cleanCache(): Promise<void> {
    try {
      const files = fs.readdirSync(this.cacheDir);
      const now = Date.now();
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

      for (const file of files) {
        const filePath = path.join(this.cacheDir, file);
        const stats = fs.statSync(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          fs.unlinkSync(filePath);
          console.log(`Cleaned old cache file: ${file}`);
        }
      }
    } catch (error) {
      console.error('Error cleaning cache:', error);
    }
  }
}

export const elevenLabsService = new ElevenLabsService();