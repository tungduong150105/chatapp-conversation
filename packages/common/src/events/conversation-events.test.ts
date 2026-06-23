import { describe, expect, it } from 'vitest';

import {
  MESSAGE_CREATED_ROUTING_KEY,
  MESSAGE_RECEIPT_UPDATED_ROUTING_KEY,
  messageCreatedEventSchema,
  messageCreatedPayloadSchema,
  messageReceiptUpdatedEventSchema,
  messageReceiptUpdatedPayloadSchema,
} from './conversation-events';

describe('messageCreatedPayloadSchema', () => {
  it('accepts a valid payload', () => {
    const parsed = messageCreatedPayloadSchema.parse({
      messageId: 'msg-1',
      conversationId: 'conv-1',
      senderId: 'user-a',
      bodyPreview: 'hello',
      recipientUserIds: ['user-b'],
    });
    expect(parsed.recipientUserIds).toEqual(['user-b']);
  });

  it('rejects missing recipientUserIds', () => {
    const result = messageCreatedPayloadSchema.safeParse({
      messageId: 'msg-1',
      conversationId: 'conv-1',
      senderId: 'user-a',
      bodyPreview: 'hello',
    });
    expect(result.success).toBe(false);
  });
});

describe('messageCreatedEventSchema', () => {
  const validEvent = {
    type: MESSAGE_CREATED_ROUTING_KEY,
    occurredAt: '2026-01-01T00:00:00.000Z',
    payload: {
      messageId: 'msg-1',
      conversationId: 'conv-1',
      senderId: 'user-a',
      bodyPreview: 'hello',
      recipientUserIds: ['user-b'],
    },
  };

  it('accepts a valid event', () => {
    const parsed = messageCreatedEventSchema.parse(validEvent);
    expect(parsed.type).toBe(MESSAGE_CREATED_ROUTING_KEY);
  });

  it('rejects wrong event type', () => {
    const result = messageCreatedEventSchema.safeParse({
      ...validEvent,
      type: 'message.updated',
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional metadata', () => {
    const parsed = messageCreatedEventSchema.parse({
      ...validEvent,
      metadata: { traceId: 'abc' },
    });
    expect(parsed.metadata).toEqual({ traceId: 'abc' });
  });
});

describe('messageReceiptUpdatedPayloadSchema', () => {
  it('accepts a valid payload', () => {
    const parsed = messageReceiptUpdatedPayloadSchema.parse({
      messageIds: ['msg-1'],
      conversationId: 'conv-1',
      senderId: 'user-a',
      recipientUserId: 'user-b',
      receiptStatus: 'read',
    });
    expect(parsed.receiptStatus).toBe('read');
  });
});

describe('messageReceiptUpdatedEventSchema', () => {
  const validEvent = {
    type: MESSAGE_RECEIPT_UPDATED_ROUTING_KEY,
    occurredAt: '2026-01-01T00:00:00.000Z',
    payload: {
      messageIds: ['msg-1'],
      conversationId: 'conv-1',
      senderId: 'user-a',
      recipientUserId: 'user-b',
      receiptStatus: 'delivered',
    },
  };

  it('accepts a valid event', () => {
    const parsed = messageReceiptUpdatedEventSchema.parse(validEvent);
    expect(parsed.type).toBe(MESSAGE_RECEIPT_UPDATED_ROUTING_KEY);
  });
});
