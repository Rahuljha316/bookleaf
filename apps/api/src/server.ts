import { app } from './app';
import { env } from './config/env';

const server = app.listen(env.PORT, '0.0.0.0', () => {
  console.log(`[API] Server running on port ${env.PORT} (${env.NODE_ENV})`);
  console.log(`[API] Health check available at http://localhost:${env.PORT}/api/health`);
});

export default server;

