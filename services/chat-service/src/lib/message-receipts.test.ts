import { describe, expect, it } from 'vitest';

import {
  attachReceiptStatuses,
  buildReceiptLookup,
  computeReceiptStatus,
} from '@/lib/message-receipts';
import type { Message } from '@/types/message';

const baseMessage = (id: string, senderId: string): Message => ({
  id,
  conversationId: 'conv-1',
  senderId,
  body: 'hi',
  createdAt: new Date(),
  reactions: [],
});

describe('computeReceiptStatus', () => {
  it('returns sent when no recipient has been notified', () => {
    const status = computeReceiptStatus(
      baseMessage('m1', 'sender'),
      ['sender', 'peer-a'],
      new Map(),
    );
    expect(status).toBe('sent');
  });

  it('returns delivered when at least one recipient was notified', () => {
    const lookup = new Map([
      ['m1:peer-a', { notifiedAt: new Date() }],
    ]);
    const status = computeReceiptStatus(
      baseMessage('m1', 'sender'),
      ['sender', 'peer-a', 'peer-b'],
      lookup,
    );
    expect(status).toBe('delivered');
  });

  it('returns read when at least one recipient read the message', () => {
    const lookup = new Map([
      ['m1:peer-a', { notifiedAt: new Date(), readAt: new Date() }],
    ]);
    const status = computeReceiptStatus(
      baseMessage('m1', 'sender'),
      ['sender', 'peer-a'],
      lookup,
    );
    expect(status).toBe('read');
  });

  it('returns read when sender is the only participant', () => {
    const status = computeReceiptStatus(
      baseMessage('m1', 'sender'),
      ['sender'],
      new Map(),
    );
    expect(status).toBe('read');
  });
});

describe('buildReceiptLookup', () => {
  it('indexes receipts by message and user', () => {
    const notifiedAt = new Date('2026-01-01T00:00:00.000Z');
    const lookup = buildReceiptLookup([
      {
        messageId: 'm1',
        userId: 'peer-a',
        conversationId: 'conv-1',
        notifiedAt,
      },
    ]);
    expect(lookup.get('m1:peer-a')?.notifiedAt).toEqual(notifiedAt);
  });
});

describe('attachReceiptStatuses', () => {
  it('adds receiptStatus to outgoing messages only', () => {
    const messages: Message[] = [
      baseMessage('m1', 'sender'),
      baseMessage('m2', 'peer-a'),
    ];
    const updated = attachReceiptStatuses(
      messages,
      'sender',
      ['sender', 'peer-a'],
      [],
    );
    expect(updated[0]?.receiptStatus).toBe('sent');
    expect(updated[1]?.receiptStatus).toBeUndefined();
  });
});
