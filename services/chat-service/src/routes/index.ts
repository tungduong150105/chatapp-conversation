import type { Router } from 'express';

import { conversationRouter } from '@/routes/conversation.routes';
import { internalRouter } from '@/routes/internal.routes';
import { presenceRouter } from '@/routes/presence.routes';

export const registerRoutes = (app: Router) => {
  // Health check endpoint for Docker/K8s
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', service: 'chat-service' });
  });

  app.use('/internal', internalRouter);
  app.use('/presence', presenceRouter);
  app.use('/conversations', conversationRouter);
};
