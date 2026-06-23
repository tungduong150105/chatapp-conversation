import { z } from 'zod';

export const CONVERSATION_EVENTS_EXCHANGE = 'conversation.events';
export const MESSAGE_CREATED_ROUTING_KEY = 'message.created';
export const MESSAGE_RECEIPT_UPDATED_ROUTING_KEY = 'message.receipt.updated';

export const messageReceiptStatusSchema = z.enum(['delivered', 'read']);
export type MessageReceiptStatusUpdate = z.infer<typeof messageReceiptStatusSchema>;

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

export const messageReceiptUpdatedPayloadSchema = z.object({
  messageIds: z.array(z.string()).min(1),
  conversationId: z.string(),
  /** Original message author — receives the WebSocket push. */
  senderId: z.string(),
  /** Participant who triggered the receipt update. */
  recipientUserId: z.string(),
  receiptStatus: messageReceiptStatusSchema,
});

export type MessageReceiptUpdatedPayload = z.infer<typeof messageReceiptUpdatedPayloadSchema>;

export const messageReceiptUpdatedEventSchema = z.object({
  type: z.literal(MESSAGE_RECEIPT_UPDATED_ROUTING_KEY),
  payload: messageReceiptUpdatedPayloadSchema,
  occurredAt: z.string(),
  metadata: z.record(z.unknown()).optional(),
});

export type MessageReceiptUpdatedEvent = z.infer<typeof messageReceiptUpdatedEventSchema>;
