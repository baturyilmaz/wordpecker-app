import mongoose from 'mongoose';
import { Word } from '../api/words/model';

const OLD_WORD_SCHEMA = new mongoose.Schema({
  list_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WordList',
    required: true
  },
  value: {
    type: String,
    required: true,
    trim: true
  },
  meaning: {
    type: String,
    required: true,
    trim: true
  },
  learnedPoint: {
    type: Number,
    default: 0
  }
}, {
  timestamps: { 
    createdAt: 'created_at', 
    updatedAt: 'updated_at' 
  }
});

const OldWord = mongoose.model('OldWord', OLD_WORD_SCHEMA, 'words');

export async function migrateWordsToNewSchema() {
  try {
    console.log('Starting word migration...');
    
    // Get all existing words
    const oldWords = await OldWord.find({}).lean();
    console.log(`Found ${oldWords.length} words to migrate`);
    
    // Group words by their normalized value
    const wordGroups = new Map<string, Array<any>>();
    
    for (const word of oldWords) {
      const normalizedValue = word.value.toLowerCase().trim();
      if (!wordGroups.has(normalizedValue)) {
        wordGroups.set(normalizedValue, []);
      }
      wordGroups.get(normalizedValue)!.push(word);
    }
    
    console.log(`Found ${wordGroups.size} unique words`);
    
    // Create new words with ownedByLists structure
    const newWords = [];
    
    for (const [normalizedValue, words] of wordGroups) {
      const ownedByLists = words.map(word => ({
        listId: word.list_id,
        meaning: word.meaning,
        learnedPoint: word.learnedPoint || 0
      }));
      
      // Use the original casing from the first occurrence
      const originalValue = words[0].value;
      const earliestDate = words.reduce((min, word) => 
        word.created_at < min ? word.created_at : min, 
        words[0].created_at
      );
      
      newWords.push({
        value: normalizedValue,
        ownedByLists,
        created_at: earliestDate,
        updated_at: new Date()
      });
    }
    
    // Clear existing words collection
    await Word.deleteMany({});
    console.log('Cleared existing words collection');
    
    // Insert new words
    await Word.insertMany(newWords);
    console.log(`Successfully migrated ${newWords.length} words`);
    
    // Verify migration
    const migratedCount = await Word.countDocuments({});
    console.log(`Verification: ${migratedCount} words in collection`);
    
    console.log('Migration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/wordpecker')
    .then(() => {
      console.log('Connected to MongoDB');
      return migrateWordsToNewSchema();
    })
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}