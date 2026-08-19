import app from '../backend/src/app';
import { initializeApplication } from '../backend/src/bootstrap';

export default async function handler(
  request: Parameters<typeof app>[0],
  response: Parameters<typeof app>[1],
) {
  try {
    await initializeApplication();
    return app(request, response);
  } catch (error) {
    console.error('Vercel function initialization failed.', {
      errorName: error instanceof Error ? error.name : 'UnknownError',
    });
    return response.status(503).json({ status: 'unavailable' });
  }
}
