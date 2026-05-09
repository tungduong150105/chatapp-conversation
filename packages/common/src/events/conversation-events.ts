import { z } from 'zod';

export const CONVERSATION_EVENTS_EXCHANGE = 'conversation.events';
export const MESSAGE_CREATED_ROUTING_KEY = 'message.created';

export const messageCreatedPayloadSchema = z.object({
  messageId: z.string(),
  conversationId: z.string(),
  senderId: z.string(),
  bodyPreview: z.string(),
  recipientUserIds: z.array(z.string()),
});

export type MessageCreatedPayload = z.infer<typeof messageCreatedPayloadSchema>;

export const messageCreatedEventSchema = z.object({
  type: z.literal(MESSAGE_CREATED_ROUTING_KEY),
  payload: messageCreatedPayloadSchema,
  occurredAt: z.string(),
  metadata: z.record(z.unknown()).optional(),
});

export type MessageCreatedEvent = z.infer<typeof messageCreatedEventSchema>;
