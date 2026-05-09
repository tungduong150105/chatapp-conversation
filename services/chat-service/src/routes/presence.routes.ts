import { Router } from 'express';

import { clearPresenceHandler, touchPresenceHandler } from '@/controllers/presence.controller';
import { attachAuthenticatedUser } from '@/middleware/authenticated-user';

export const presenceRouter: Router = Router();

presenceRouter.use(attachAuthenticatedUser);
presenceRouter.post('/', touchPresenceHandler);
presenceRouter.delete('/', clearPresenceHandler);
