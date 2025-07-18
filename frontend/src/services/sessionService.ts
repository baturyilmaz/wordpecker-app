import { Exercise, Question } from '../types';
import { isCorrectAnswer } from '../utils/answerValidation';

export interface SessionStats {
  totalQuestions: number;
  correct: number;
  incorrect: number;
  streak: number;
  maxStreak: number;
  score: number;
  timeSpent: number;
  completionRate: number;
}

export interface SessionProgress {
  currentIndex: number;
  totalQuestions: number;
  answered: boolean[];
  userAnswers: string[];
  correctAnswers: string[];
  isComplete: boolean;
  stats: SessionStats;
}

export class SessionService {
  private startTime: number = Date.now();
  private progress: SessionProgress;

  constructor(questions: (Exercise | Question)[]) {
    this.progress = {
      currentIndex: 0,
      totalQuestions: questions.length,
      answered: new Array(questions.length).fill(false),
      userAnswers: new Array(questions.length).fill(''),
      correctAnswers: questions.map(q => q.correctAnswer),
      isComplete: false,
      stats: {
        totalQuestions: questions.length,
        correct: 0,
        incorrect: 0,
        streak: 0,
        maxStreak: 0,
        score: 0,
        timeSpent: 0,
        completionRate: 0
      }
    };
  }

  getCurrentProgress(): SessionProgress {
    return { ...this.progress };
  }

  answerQuestion(userAnswer: string, question: Exercise | Question, overrideCorrect?: boolean): boolean {
    const isCorrect = overrideCorrect !== undefined ? overrideCorrect : this.checkAnswer(userAnswer, question);
    
    // Update progress
    this.progress.answered[this.progress.currentIndex] = true;
    this.progress.userAnswers[this.progress.currentIndex] = userAnswer;
    
    // Update stats
    if (isCorrect) {
      this.progress.stats.correct++;
      this.progress.stats.streak++;
      this.progress.stats.maxStreak = Math.max(this.progress.stats.maxStreak, this.progress.stats.streak);
      this.progress.stats.score += this.calculateScore(this.progress.stats.streak);
    } else {
      this.progress.stats.incorrect++;
      this.progress.stats.streak = 0;
    }
    
    // Update completion rate
    const answeredCount = this.progress.answered.filter(Boolean).length;
    this.progress.stats.completionRate = (answeredCount / this.progress.totalQuestions) * 100;
    
    return isCorrect;
  }

  nextQuestion(): boolean {
    if (this.progress.currentIndex < this.progress.totalQuestions - 1) {
      this.progress.currentIndex++;
      return true;
    }
    return false;
  }

  previousQuestion(): boolean {
    if (this.progress.currentIndex > 0) {
      this.progress.currentIndex--;
      return true;
    }
    return false;
  }

  completeSession(): SessionStats {
    this.progress.isComplete = true;
    this.progress.stats.timeSpent = Date.now() - this.startTime;
    return this.progress.stats;
  }

  private checkAnswer(userAnswer: string, question: Exercise | Question): boolean {
    if (question.type === 'matching') {
      // Parse user matching answers
      const userAnswers = userAnswer.split('|').reduce((acc, pair) => {
        const [word, definition] = pair.split(':');
        if (word && definition) acc[word] = definition;
        return acc;
      }, {} as Record<string, string>);
      
      const correctPairs = question.pairs || [];
      return correctPairs.every(pair => userAnswers[pair.word] === pair.definition);
    } else {
      // Use the new validation utility for all other types
      return isCorrectAnswer(userAnswer, question);
    }
  }

  private calculateScore(streak: number): number {
    if (streak > 4) return 200;
    if (streak > 2) return 150;
    if (streak > 1) return 120;
    return 100;
  }

  // Get performance insights
  getInsights(): string[] {
    const insights: string[] = [];
    const { correct, incorrect, maxStreak, completionRate } = this.progress.stats;
    
    if (completionRate === 100) {
      insights.push('🎉 Completed all questions!');
    }
    
    if (correct > incorrect) {
      insights.push('🎯 Great accuracy!');
    }
    
    if (maxStreak >= 5) {
      insights.push('🔥 Amazing streak!');
    } else if (maxStreak >= 3) {
      insights.push('⚡ Good streak!');
    }
    
    if (completionRate >= 80) {
      insights.push('💪 Strong performance!');
    }
    
    return insights;
  }
}