import {
  MESSAGE_RECEIPT_UPDATED_ROUTING_KEY,
  type MessageReceiptStatusUpdate,
} from '@chatapp/common';

import { messageRepository } from '@/repositories/message.repository';
import { publishMessageReceiptUpdated } from '@/messaging/rabbitmq.publisher';

/** Fan-out receipt updates to each original message sender (Messenger-style tick push). */
export async function publishReceiptUpdates(
  conversationId: string,
  recipientUserId: string,
  messageIds: string[],
  receiptStatus: MessageReceiptStatusUpdate,
): Promise<void> {
  if (messageIds.length === 0) {
    return;
  }

  const bySender = new Map<string, string[]>();
  for (const messageId of messageIds) {
    const msg = await messageRepository.findById(messageId);
    if (!msg || msg.conversationId !== conversationId) {
      continue;
    }
    const list = bySender.get(msg.senderId) ?? [];
    list.push(msg.id);
    bySender.set(msg.senderId, list);
  }

  const occurredAt = new Date().toISOString();
  for (const [senderId, ids] of bySender) {
    publishMessageReceiptUpdated({
      type: MESSAGE_RECEIPT_UPDATED_ROUTING_KEY,
      occurredAt,
      payload: {
        messageIds: ids,
        conversationId,
        senderId,
        recipientUserId,
        receiptStatus,
      },
    });
  }
}
