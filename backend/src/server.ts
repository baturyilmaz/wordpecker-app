import app from './app';
import { initializeApplication } from './bootstrap';
import { environment } from './config/environment';

const startServer = async () => {
  await initializeApplication();
  app.listen(environment.port, () => {
    console.log(`Server running on port ${environment.port} in ${environment.nodeEnv} mode`);
  });
};

startServer().catch((error) => {
  console.error('Failed to initialize application.', {
    errorName: error instanceof Error ? error.name : 'UnknownError',
  });
  process.exitCode = 1;
});
