import { asyncHandler } from '@chatapp/common';
import type { RequestHandler } from 'express';

import { messageService } from '@/services/message.service';
import { conversationIdParamsSchema } from '@/validation/shared.schema';
import {
  deliveryAckInternalBodySchema,
  markNotifiedInternalBodySchema,
} from '@/validation/internal.schema';

export const markNotifiedInternalHandler: RequestHandler = asyncHandler(async (req, res) => {
  const { id: conversationId } = conversationIdParamsSchema.parse(req.params);
  const body = markNotifiedInternalBodySchema.parse(req.body);
  await messageService.markRecipientsNotified(conversationId, body.messageId, body.recipientUserIds);
  res.status(204).send();
});

export const deliveryAckInternalHandler: RequestHandler = asyncHandler(async (req, res) => {
  const { id: conversationId } = conversationIdParamsSchema.parse(req.params);
  const body = deliveryAckInternalBodySchema.parse(req.body);
  await messageService.recordPushDeliveryAck(conversationId, body.messageId, body.recipientUserId);
  res.status(204).send();
});
