import { validateRequest } from '@chatapp/common';
import { Router } from 'express';

import { deliveryAckInternalHandler, markNotifiedInternalHandler } from '@/controllers/internal.controller';
import { conversationIdParamsSchema } from '@/validation/shared.schema';
import {
  deliveryAckInternalBodySchema,
  markNotifiedInternalBodySchema,
} from '@/validation/internal.schema';

export const internalRouter: Router = Router();

internalRouter.post(
  '/conversations/:id/receipts/notified',
  validateRequest({
    params: conversationIdParamsSchema,
    body: markNotifiedInternalBodySchema,
  }),
  markNotifiedInternalHandler,
);

internalRouter.post(
  '/conversations/:id/receipts/delivery-ack',
  validateRequest({
    params: conversationIdParamsSchema,
    body: deliveryAckInternalBodySchema,
  }),
  deliveryAckInternalHandler,
);
