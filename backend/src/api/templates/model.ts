import mongoose, { Document, Schema } from 'mongoose';

export interface ITemplate extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  description: string;
  context?: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  words: Array<{
    value: string;
    meaning: string;
  }>;
  cloneCount: number;
  featured: boolean;
  created_at: Date;
  updated_at: Date;
}

const TemplateSchema = new Schema<ITemplate>({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  context: {
    type: String,
    trim: true,
    maxlength: 200
  },
  category: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    required: true
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: 30
  }],
  words: [{
    value: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    meaning: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500
    }
  }],
  cloneCount: {
    type: Number,
    default: 0,
    min: 0
  },
  featured: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: { 
    createdAt: 'created_at', 
    updatedAt: 'updated_at' 
  }
});

// Indexes for efficient querying
TemplateSchema.index({ category: 1, difficulty: 1 });
TemplateSchema.index({ featured: 1, cloneCount: -1 });
TemplateSchema.index({ tags: 1 });

export const Template = mongoose.model<ITemplate>('Template', TemplateSchema);