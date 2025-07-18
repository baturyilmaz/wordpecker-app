import { UserPreferences } from '../api/preferences/model';

export interface UserLanguages {
  baseLanguage: string;
  targetLanguage: string;
}

export async function getUserLanguages(userId: string): Promise<UserLanguages> {
  const preferences = await UserPreferences.findOne({ userId });
  
  if (preferences) {
    return {
      baseLanguage: preferences.baseLanguage || 'en',
      targetLanguage: preferences.targetLanguage || 'en'
    };
  }
  
  // Return defaults if no preferences exist
  return {
    baseLanguage: 'en',
    targetLanguage: 'en'
  };
}