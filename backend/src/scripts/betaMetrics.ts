import { config } from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { ProductEvent } from '../api/product-events/model';
import { Lesson } from '../api/lessons/model';
import { calculateBetaMetrics, calculateLessonQualityMetrics, parseBetaWindowStart } from '../api/product-events/metrics';

config({ path: path.resolve(__dirname, '../../.env') });

const run = async () => {
  const mongodbUrl = process.env.MONGODB_URL;
  if (!mongodbUrl) throw new Error('MONGODB_URL is required.');
  const since = parseBetaWindowStart(process.argv.slice(2));
  const windowQuery = since ? { createdAt: { $gte: since } } : {};
  await mongoose.connect(mongodbUrl);
  const [events, lessons] = await Promise.all([
    ProductEvent.find(windowQuery)
    .select('ownerId userId eventName articleId lessonId lessonItemId quizId dedupeKey metadata createdAt')
    .sort({ createdAt: 1 })
    .lean(),
    Lesson.find(windowQuery)
      .select('status contentDensity items generationMeta.durationMs')
      .lean(),
  ]);
  const result = {
    window: { since: since?.toISOString() || null, until: new Date().toISOString() },
    ...calculateBetaMetrics(events),
    quality: calculateLessonQualityMetrics(lessons.map((lesson) => ({
      status: lesson.status,
      contentDensity: lesson.contentDensity,
      itemCount: lesson.items.length,
      durationMs: lesson.generationMeta?.durationMs,
    }))),
  };
  console.log(JSON.stringify(result, null, 2));
};

run()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : 'Beta metrics query failed.');
    process.exitCode = 1;
  })
  .finally(async () => mongoose.disconnect());
