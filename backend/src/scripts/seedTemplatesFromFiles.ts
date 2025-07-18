import { connectDB } from '../config/mongodb';
import { Template } from '../api/templates/model';
import * as fs from 'fs';
import * as path from 'path';

interface TemplateData {
  name: string;
  description: string;
  context?: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  featured: boolean;
  words: Array<{
    value: string;
    meaning: string;
  }>;
}

async function loadTemplatesFromFiles(): Promise<TemplateData[]> {
  const templatesDir = path.join(__dirname, '../../data/templates');
  const templates: TemplateData[] = [];
  
  try {
    // Check if templates directory exists
    if (!fs.existsSync(templatesDir)) {
      console.error(`Templates directory not found: ${templatesDir}`);
      process.exit(1);
    }
    
    // Read all JSON files from the templates directory
    const files = fs.readdirSync(templatesDir).filter(file => file.endsWith('.json'));
    
    if (files.length === 0) {
      console.warn('No JSON template files found in the templates directory');
      return templates;
    }
    
    console.log(`Found ${files.length} template files:`);
    
    for (const file of files) {
      try {
        const filePath = path.join(templatesDir, file);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const templateData: TemplateData = JSON.parse(fileContent);
        
        // Validate template data
        if (!templateData.name || !templateData.description || !templateData.category) {
          console.error(`Invalid template data in file: ${file}`);
          continue;
        }
        
        if (!templateData.words || !Array.isArray(templateData.words) || templateData.words.length === 0) {
          console.error(`No words found in template file: ${file}`);
          continue;
        }
        
        // Validate word structure
        const validWords = templateData.words.filter(word => 
          word.value && word.meaning && 
          typeof word.value === 'string' && 
          typeof word.meaning === 'string'
        );
        
        if (validWords.length !== templateData.words.length) {
          console.warn(`Some invalid words found in ${file}, using ${validWords.length}/${templateData.words.length} words`);
          templateData.words = validWords;
        }
        
        templates.push(templateData);
        console.log(`✓ Loaded: ${templateData.name} (${templateData.words.length} words)`);
        
      } catch (error) {
        console.error(`Error parsing template file ${file}:`, error);
      }
    }
    
    return templates;
    
  } catch (error) {
    console.error('Error reading templates directory:', error);
    process.exit(1);
  }
}

async function seedTemplatesFromFiles() {
  try {
    console.log('🌱 Starting template seeding from JSON files...\n');
    
    // Connect to database
    console.log('📡 Connecting to database...');
    await connectDB();
    console.log('✓ Database connected successfully\n');
    
    // Load templates from JSON files
    console.log('📂 Loading templates from JSON files...');
    const templateData = await loadTemplatesFromFiles();
    
    if (templateData.length === 0) {
      console.log('⚠️  No valid templates found to seed');
      process.exit(0);
    }
    
    console.log(`\n📋 Found ${templateData.length} valid templates\n`);
    
    // Clear existing templates
    console.log('🗑️  Clearing existing templates...');
    const deletedCount = await Template.deleteMany({});
    console.log(`✓ Removed ${deletedCount.deletedCount} existing templates\n`);
    
    // Insert new templates
    console.log('📝 Inserting new templates...');
    const insertedTemplates = await Template.insertMany(templateData);
    console.log(`✅ Successfully inserted ${insertedTemplates.length} templates\n`);
    
    // Generate summary statistics
    const categories = await Template.distinct('category');
    const totalWords = templateData.reduce((sum, template) => sum + template.words.length, 0);
    const featuredCount = templateData.filter(t => t.featured).length;
    
    // Difficulty distribution
    const difficultyStats = {
      beginner: templateData.filter(t => t.difficulty === 'beginner').length,
      intermediate: templateData.filter(t => t.difficulty === 'intermediate').length,
      advanced: templateData.filter(t => t.difficulty === 'advanced').length
    };
    
    // Category distribution
    const categoryStats: { [key: string]: number } = {};
    templateData.forEach(template => {
      categoryStats[template.category] = (categoryStats[template.category] || 0) + 1;
    });
    
    console.log('=' .repeat(60));
    console.log('🎉 TEMPLATE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('=' .repeat(60));
    console.log(`📊 SUMMARY STATISTICS:`);
    console.log(`   📚 Total Templates: ${templateData.length}`);
    console.log(`   📝 Total Words: ${totalWords}`);
    console.log(`   ⭐ Featured Templates: ${featuredCount}`);
    console.log(`   🏷️  Categories: ${categories.length} (${categories.join(', ')})`);
    console.log('');
    console.log(`📈 DIFFICULTY DISTRIBUTION:`);
    console.log(`   🌱 Beginner: ${difficultyStats.beginner}`);
    console.log(`   🌿 Intermediate: ${difficultyStats.intermediate}`);
    console.log(`   🌳 Advanced: ${difficultyStats.advanced}`);
    console.log('');
    console.log(`🗂️  CATEGORY DISTRIBUTION:`);
    Object.entries(categoryStats).forEach(([category, count]) => {
      console.log(`   ${category}: ${count} templates`);
    });
    console.log('');
    console.log(`📋 TEMPLATE DETAILS:`);
    templateData.forEach((template, index) => {
      const difficultyEmoji = {
        beginner: '🌱',
        intermediate: '🌿',
        advanced: '🌳'
      }[template.difficulty];
      
      const featuredText = template.featured ? '⭐' : '  ';
      console.log(`   ${index + 1}. ${featuredText} ${difficultyEmoji} ${template.name} (${template.words.length} words)`);
    });
    
    console.log('');
    console.log('🚀 Templates are now ready for users to browse and clone!');
    console.log('=' .repeat(60));
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error seeding templates:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  seedTemplatesFromFiles();
}

export { seedTemplatesFromFiles, loadTemplatesFromFiles };