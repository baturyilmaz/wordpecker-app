// Jest setup file for backend tests
import { config } from 'dotenv';

// Load environment variables for testing
config();

// Set test environment
process.env.NODE_ENV = 'test';
process.env.MONGODB_URL = process.env.MONGODB_URL || 'mongodb://localhost:27017/wordpecker_test';

// Mock console.log to reduce noise in tests
if (typeof jest !== 'undefined') {
  // eslint-disable-next-line no-undef
  const jestFn = (jest as any).fn;
  global.console = {
    ...console,
    log: jestFn(),
    info: jestFn(),
    warn: jestFn(),
    error: jestFn()
  };
}