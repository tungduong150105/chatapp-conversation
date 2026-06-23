import { asyncHandler, HttpError } from '@chatapp/common';
import type { RequestHandler } from 'express';
import { conversationService } from '@/services/conversation.service';
import {
  createConversationSchema,
  listConversationsQuerySchema,
} from '@/validation/conversation.schema';
import { conversationIdParamsSchema } from '@/validation/shared.schema';
import { getAuthenticatedUser } from '@/utils/auth';
import {
  createMessageBodySchema,
  listMessagesQuerySchema,
  markDeliveredBodySchema,
  markNotifyReceivedBodySchema,
  markReadBodySchema,
} from '@/validation/message.schema';
import { messageService } from '@/services/message.service';

const parsedConversation = (params: unknown) => {
  const { id } = conversationIdParamsSchema.parse(params);
  return id;
};

export const createConversationHandler: RequestHandler = asyncHandler(async (req, res) => {
  const user = getAuthenticatedUser(req);
  const payload = createConversationSchema.parse(req.body);
  const uniqueParticipantIds = Array.from(new Set([...payload.participantIds, user.id]));

  if (uniqueParticipantIds.length < 2) {
    throw new HttpError(400, 'Conversation must atleast include one other participant');
  }

  const inferredType =
    payload.type ?? (uniqueParticipantIds.length === 2 ? 'direct' : 'group');

  if (inferredType === 'group' && uniqueParticipantIds.length < 3) {
    throw new HttpError(400, 'Group conversations require at least two other participants');
  }

  const { conversation, created } = await conversationService.createConversation({
    type: inferredType,
    title: payload.title,
    participantIds: uniqueParticipantIds,
    createdBy: user.id,
  });
  res.status(created ? 201 : 200).json({ data: conversation });
});

export const listConversationHandler: RequestHandler = asyncHandler(async (req, res) => {
  const user = getAuthenticatedUser(req);
  const filter = listConversationsQuerySchema.parse(req.query);
  if (filter.participantId && filter.participantId !== user.id) {
    throw new HttpError(403, 'Unauthorized');
  }

  const conversations = await conversationService.listConversation({ participantId: user.id });
  res.status(201).json({ data: conversations });
});

export const getConversationHandler: RequestHandler = asyncHandler(async (req, res) => {
  const user = getAuthenticatedUser(req);
  const conversationId = parsedConversation(req.params);
  const conversation = await conversationService.getConversationById(conversationId);

  if (!conversation.participantIds.includes(user.id)) {
    throw new HttpError(403, 'Unauthorized');
  }

  res.status(201).json({ data: conversation });
});

export const createMessageHandler: RequestHandler = asyncHandler(async (req, res) => {
  const user = getAuthenticatedUser(req);
  const conversationId = parsedConversation(req.params);
  const payload = createMessageBodySchema.parse(req.body);
  const message = await messageService.createMessage(
    conversationId,
    user.id,
    payload.body,
    payload.attachments,
  );
  res.status(201).json({ data: message });
});

export const listMessageHandler: RequestHandler = asyncHandler(async (req, res) => {
  const user = getAuthenticatedUser(req);
  const conversationId = parsedConversation(req.params);
  const query = listMessagesQuerySchema.parse(req.query);
  const after = query.after ? new Date(query.after) : undefined;
  const messages = await messageService.listMessages(conversationId, user.id, {
    limit: query.limit,
    after,
  });
  res.json({ data: messages });
});

export const markDeliveredHandler: RequestHandler = asyncHandler(async (req, res) => {
  const user = getAuthenticatedUser(req);
  const conversationId = parsedConversation(req.params);
  const body = markDeliveredBodySchema.parse(req.body);
  await messageService.markMessagesDelivered(conversationId, user.id, body.messageIds);
  res.status(204).send();
});

export const markNotifyReceivedHandler: RequestHandler = asyncHandler(async (req, res) => {
  const user = getAuthenticatedUser(req);
  const conversationId = parsedConversation(req.params);
  const body = markNotifyReceivedBodySchema.parse(req.body);
  await messageService.markMessagesNotifyReceived(conversationId, user.id, body.messageIds);
  res.status(204).send();
});

export const markReadHandler: RequestHandler = asyncHandler(async (req, res) => {
  const user = getAuthenticatedUser(req);
  const conversationId = parsedConversation(req.params);
  const body = markReadBodySchema.parse(req.body);
  await messageService.markMessagesRead(conversationId, user.id, body.lastReadMessageId);
  res.status(204).send();
});
