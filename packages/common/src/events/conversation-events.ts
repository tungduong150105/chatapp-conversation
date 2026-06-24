import { z } from 'zod';

export const CONVERSATION_EVENTS_EXCHANGE = 'conversation.events';

// Routing keys
export const MESSAGE_CREATED_ROUTING_KEY = 'message.created';
export const MESSAGE_RECEIPT_UPDATED_ROUTING_KEY = 'message.receipt.updated';
export const NOTIFICATION_CREATED_ROUTING_KEY = 'notification.created';
export const MESSAGE_DELIVERED_ROUTING_KEY = 'message.delivered';
export const MESSAGE_FAILED_ROUTING_KEY = 'message.failed';

export const messageReceiptStatusSchema = z.enum(['delivered', 'read']);
export type MessageReceiptStatusUpdate = z.infer<typeof messageReceiptStatusSchema>;

// ---- message.created ----

export const messageCreatedPayloadSchema = z.object({
  messageId: z.string(),
  conversationId: z.string(),
  senderId: z.string(),
  bodyPreview: z.string(),
  recipientUserIds: z.array(z.string()),
  sagaId: z.string().optional(),
});

export type MessageCreatedPayload = z.infer<typeof messageCreatedPayloadSchema>;

export const messageCreatedEventSchema = z.object({
  type: z.literal(MESSAGE_CREATED_ROUTING_KEY),
  payload: messageCreatedPayloadSchema,
  occurredAt: z.string(),
  metadata: z.record(z.unknown()).optional(),
});

export type MessageCreatedEvent = z.infer<typeof messageCreatedEventSchema>;

// ---- message.receipt.updated ----

export const messageReceiptUpdatedPayloadSchema = z.object({
  messageIds: z.array(z.string()).min(1),
  conversationId: z.string(),
  senderId: z.string(),
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

// ---- notification.created ----

export const notificationCreatedPayloadSchema = z.object({
  sagaId: z.string(),
  messageId: z.string(),
  conversationId: z.string(),
  recipientUserIds: z.array(z.string()),
});

export type NotificationCreatedPayload = z.infer<typeof notificationCreatedPayloadSchema>;

export const notificationCreatedEventSchema = z.object({
  type: z.literal(NOTIFICATION_CREATED_ROUTING_KEY),
  payload: notificationCreatedPayloadSchema,
  occurredAt: z.string(),
});

export type NotificationCreatedEvent = z.infer<typeof notificationCreatedEventSchema>;

// ---- message.delivered ----

export const messageDeliveredPayloadSchema = z.object({
  sagaId: z.string(),
  messageId: z.string(),
  conversationId: z.string(),
  deliveredToUserIds: z.array(z.string()),
});

export type MessageDeliveredPayload = z.infer<typeof messageDeliveredPayloadSchema>;

export const messageDeliveredEventSchema = z.object({
  type: z.literal(MESSAGE_DELIVERED_ROUTING_KEY),
  payload: messageDeliveredPayloadSchema,
  occurredAt: z.string(),
});

export type MessageDeliveredEvent = z.infer<typeof messageDeliveredEventSchema>;

// ---- message.failed (compensation) ----

export const messageFailedPayloadSchema = z.object({
  sagaId: z.string(),
  messageId: z.string(),
  conversationId: z.string(),
  failedStep: z.enum(['notification', 'delivery']),
  reason: z.string(),
});

export type MessageFailedPayload = z.infer<typeof messageFailedPayloadSchema>;

export const messageFailedEventSchema = z.object({
  type: z.literal(MESSAGE_FAILED_ROUTING_KEY),
  payload: messageFailedPayloadSchema,
  occurredAt: z.string(),
});

export type MessageFailedEvent = z.infer<typeof messageFailedEventSchema>;
