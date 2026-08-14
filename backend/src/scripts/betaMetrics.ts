import { config } from 'dotenv';
import mongoose from 'mongoose';
import { ProductEvent } from '../api/product-events/model';
import { calculateBetaMetrics } from '../api/product-events/metrics';

config();

const run = async () => {
  const mongodbUrl = process.env.MONGODB_URL;
  if (!mongodbUrl) throw new Error('MONGODB_URL is required.');
  await mongoose.connect(mongodbUrl);
  const events = await ProductEvent.find({}).select('ownerId userId eventName metadata createdAt').sort({ createdAt: 1 }).lean();
  const result = calculateBetaMetrics(events);
  console.log(JSON.stringify(result, null, 2));
};

run()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : 'Beta metrics query failed.');
    process.exitCode = 1;
  })
  .finally(async () => mongoose.disconnect());
