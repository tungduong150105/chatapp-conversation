import type { Message, MessageReceiptStatus } from '@/types/message';
import type { MessageReceiptRecord } from '@/repositories/message-receipt.repository';

const receiptKey = (messageId: string, recipientUserId: string) => `${messageId}:${recipientUserId}`;

export function buildReceiptLookup(records: MessageReceiptRecord[]): Map<
  string,
  { notifiedAt?: Date; readAt?: Date }
> {
  const map = new Map<string, { notifiedAt?: Date; readAt?: Date }>();
  for (const r of records) {
    map.set(receiptKey(r.messageId, r.userId), {
      notifiedAt: r.notifiedAt,
      readAt: r.readAt,
    });
  }
  return map;
}

/**
 * Outgoing ticks (aggregate over all other participants):
 * - sent: **no one** has been notified yet (`notifiedAt` / read) for this message
 * - delivered: **at least one** has `notifiedAt` (or read), **not** “seen” yet
 * - read (seen): **at least one** has `readAt`
 */
export function computeReceiptStatus(
  message: Message,
  participantIds: string[],
  lookup: Map<string, { notifiedAt?: Date; readAt?: Date }>,
): MessageReceiptStatus {
  const others = participantIds.filter((id) => id !== message.senderId);
  if (others.length === 0) {
    return 'read';
  }

  let anyRead = false;
  let anyNotified = false;

  for (const userId of others) {
    const rec = lookup.get(receiptKey(message.id, userId));
    const read = Boolean(rec?.readAt);
    const notified = read || Boolean(rec?.notifiedAt);
    if (read) {
      anyRead = true;
    }
    if (notified) {
      anyNotified = true;
    }
  }

  if (anyRead) {
    return 'read';
  }
  if (anyNotified) {
    return 'delivered';
  }
  return 'sent';
}

export function attachReceiptStatuses(
  messages: Message[],
  requesterId: string,
  participantIds: string[],
  records: MessageReceiptRecord[],
): Message[] {
  const outgoing = messages.filter((m) => m.senderId === requesterId);
  if (outgoing.length === 0) {
    return messages;
  }

  const others = participantIds.filter((id) => id !== requesterId);
  if (others.length === 0) {
    return messages.map((m) =>
      m.senderId === requesterId ? { ...m, receiptStatus: 'read' as const } : m,
    );
  }

  const ids = outgoing.map((m) => m.id);
  const relevant = records.filter(
    (r) => ids.includes(r.messageId) && others.includes(r.userId),
  );
  const lookup = buildReceiptLookup(relevant);

  return messages.map((m) => {
    if (m.senderId !== requesterId) {
      return m;
    }
    const status = computeReceiptStatus(m, participantIds, lookup);
    return { ...m, receiptStatus: status };
  });
}
