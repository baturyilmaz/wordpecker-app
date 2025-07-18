import { Router, Request, Response } from 'express';
import { validate } from 'echt';
import { Template } from './model';
import { WordList } from '../lists/model';
import { Word } from '../words/model';
import { templateParamsSchema, cloneTemplateSchema, templatesQuerySchema } from './schemas';

const router = Router();

const transformTemplate = (template: any, includeWords = false) => ({
  id: template._id.toString(),
  name: template.name,
  description: template.description,
  context: template.context,
  category: template.category,
  difficulty: template.difficulty,
  tags: template.tags,
  ...(includeWords && { words: template.words }),
  wordCount: template.words.length,
  cloneCount: template.cloneCount,
  featured: template.featured,
  created_at: template.created_at.toISOString(),
  updated_at: template.updated_at.toISOString()
});

router.get('/', validate(templatesQuerySchema), async (req, res) => {
  try {
    const { category, difficulty, search, featured } = req.query;
    
    const filter: Record<string, any> = {};
    if (category && category !== 'all') filter.category = category;
    if (difficulty && difficulty !== 'all') filter.difficulty = difficulty;
    if (featured === 'true') filter.featured = true;
    if (search) {
      const term = search as string;
      filter.$or = [
        { name: { $regex: term, $options: 'i' } },
        { description: { $regex: term, $options: 'i' } },
        { tags: { $in: [new RegExp(term, 'i')] } }
      ];
    }
    
    const templates = await Template.find(filter)
      .sort({ featured: -1, cloneCount: -1, created_at: -1 })
      .lean();
    
    res.json(templates.map(t => transformTemplate(t)));
  } catch (error) {
    res.status(500).json({ message: 'Error fetching templates' });
  }
});

router.get('/categories', async (req: Request, res: Response) => {
  try {
    const categories = await Template.distinct('category');
    res.json(categories.sort());
  } catch (error) {
    res.status(500).json({ message: 'Error fetching categories' });
  }
});

router.get('/:id', validate(templateParamsSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const template = await Template.findById(id).lean();
    if (!template) return res.status(404).json({ message: 'Template not found' });
    
    res.json(transformTemplate(template, true));
  } catch (error) {
    res.status(500).json({ message: 'Error fetching template' });
  }
});

router.post('/:id/clone', validate(cloneTemplateSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    
    const template = await Template.findById(id);
    if (!template) return res.status(404).json({ message: 'Template not found' });
    
    const savedList = await WordList.create({
      name: name || `${template.name} (Copy)`,
      description: template.description,
      context: template.context
    });
    
    await Promise.all(template.words.map(async templateWord => {
      const value = templateWord.value.toLowerCase().trim();
      let word = await Word.findOne({ value });
      
      if (word) {
        word.ownedByLists.push({
          listId: savedList._id,
          meaning: templateWord.meaning,
          learnedPoint: 0
        });
        await word.save();
      } else {
        await Word.create({
          value,
          ownedByLists: [{
            listId: savedList._id,
            meaning: templateWord.meaning,
            learnedPoint: 0
          }]
        });
      }
    }));
    
    await Template.findByIdAndUpdate(id, { $inc: { cloneCount: 1 } });
    
    res.status(201).json({
      id: savedList._id.toString(),
      name: savedList.name,
      description: savedList.description,
      context: savedList.context,
      wordCount: template.words.length,
      averageProgress: 0,
      masteredWords: 0,
      created_at: savedList.created_at.toISOString(),
      updated_at: savedList.updated_at.toISOString()
    });
  } catch (error) {
    res.status(500).json({ message: 'Error cloning template' });
  }
});

export default router;