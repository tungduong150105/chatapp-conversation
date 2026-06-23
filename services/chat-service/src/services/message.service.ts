import type { Message, MessageAttachment, MessageListOptions } from '@/types/message';

import { attachReceiptStatuses } from '@/lib/message-receipts';
import { messageReceiptRepository } from '@/repositories/message-receipt.repository';
import { messageRepository } from '@/repositories/message.repository';
import { publishMessageCreated } from '@/messaging/rabbitmq.publisher';
import { publishReceiptUpdates } from '@/messaging/publish-receipt-updates';
import { conversationService } from '@/services/conversation.service';
import { presenceRepository } from '@/repositories/presence.repository';
import { HttpError, MESSAGE_CREATED_ROUTING_KEY } from '@chatapp/common';

const BODY_PREVIEW_MAX = 500;

const buildBodyPreview = (body: string, attachments?: MessageAttachment[]): string => {
  const trimmed = body.trim();
  if (trimmed.length > 0) {
    return trimmed.length <= BODY_PREVIEW_MAX ? trimmed : `${trimmed.slice(0, BODY_PREVIEW_MAX)}…`;
  }
  if (attachments && attachments.length > 0) {
    const first = attachments[0];
    if (first.mimeType?.startsWith('image/')) {
      return attachments.length > 1 ? `[${attachments.length} photos]` : '[Photo]';
    }
    return attachments.length > 1
      ? `[${attachments.length} attachments]`
      : `[${first.filename ?? 'Attachment'}]`;
  }
  return '';
};

export const messageService = {
  async createMessage(
    conversationId: string,
    senderId: string,
    body: string,
    attachments?: MessageAttachment[],
  ): Promise<Message> {
    // Ensure conversation exists before inserting the message
    const conversation = await conversationService.getConversationById(conversationId);

    if (!conversation.participantIds.includes(senderId)) {
      throw new HttpError(403, 'Sender is not part of this conversation');
    }

    const normalizedBody = body.trim();
    const message = await messageRepository.create(
      conversationId,
      senderId,
      normalizedBody,
      attachments,
    );
    const preview = buildBodyPreview(normalizedBody, attachments);
    await conversationService.touchConversation(conversationId, preview.slice(0, 120), message.createdAt);

    const recipientUserIds = conversation.participantIds.filter((id) => id !== senderId);
    const bodyPreview = buildBodyPreview(normalizedBody, attachments);

    publishMessageCreated({
      type: MESSAGE_CREATED_ROUTING_KEY,
      occurredAt: message.createdAt.toISOString(),
      payload: {
        messageId: message.id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        bodyPreview,
        recipientUserIds,
      },
    });

    return { ...message, receiptStatus: 'sent' as const };
  },

  async listMessages(
    conversationId: string,
    requesterId: string,
    options: MessageListOptions = {},
  ): Promise<Message[]> {
    // Ensure conversation exists; re-use conversation service for caching behavior
    const conversation = await conversationService.getConversationById(conversationId);

    if (!conversation.participantIds.includes(requesterId)) {
      throw new HttpError(403, 'Requester is not part of this conversation');
    }

    const messages = await messageRepository.findByConversation(conversationId, options);
    const outgoing = messages.filter((m) => m.senderId === requesterId);
    if (outgoing.length === 0) {
      return messages;
    }

    const others = conversation.participantIds.filter((id) => id !== requesterId);
    const records = await messageReceiptRepository.findForMessagesAndUsers(
      outgoing.map((m) => m.id),
      others.length > 0 ? others : conversation.participantIds,
    );

    return attachReceiptStatuses(messages, requesterId, conversation.participantIds, records);
  },

  async markMessagesDelivered(
    conversationId: string,
    viewerId: string,
    messageIds: string[],
  ): Promise<void> {
    const conversation = await conversationService.getConversationById(conversationId);

    if (!conversation.participantIds.includes(viewerId)) {
      throw new HttpError(403, 'Requester is not part of this conversation');
    }

    const allowed: string[] = [];
    for (const messageId of messageIds) {
      const msg = await messageRepository.findById(messageId);
      if (!msg || msg.conversationId !== conversationId) {
        continue;
      }
      if (msg.senderId === viewerId) {
        continue;
      }
      allowed.push(messageId);
    }

    if (allowed.length === 0) {
      return;
    }

    await messageReceiptRepository.markDelivered(conversationId, viewerId, allowed);
    await publishReceiptUpdates(conversationId, viewerId, allowed, 'delivered');
  },

  /**
   * Recipient marks `notifiedAt` on **incoming** messages (client active / could receive; backfills when they were offline during push fan-out).
   */
  async markMessagesNotifyReceived(
    conversationId: string,
    viewerId: string,
    messageIds: string[],
  ): Promise<void> {
    const conversation = await conversationService.getConversationById(conversationId);

    if (!conversation.participantIds.includes(viewerId)) {
      throw new HttpError(403, 'Requester is not part of this conversation');
    }

    const allowed: string[] = [];
    for (const messageId of messageIds) {
      const msg = await messageRepository.findById(messageId);
      if (!msg || msg.conversationId !== conversationId) {
        continue;
      }
      if (msg.senderId === viewerId) {
        continue;
      }
      allowed.push(messageId);
    }

    if (allowed.length === 0) {
      return;
    }

    await messageReceiptRepository.markNotified(conversationId, viewerId, allowed);
    await publishReceiptUpdates(conversationId, viewerId, allowed, 'delivered');
  },

  async markMessagesRead(
    conversationId: string,
    viewerId: string,
    lastReadMessageId: string,
  ): Promise<void> {
    const conversation = await conversationService.getConversationById(conversationId);

    if (!conversation.participantIds.includes(viewerId)) {
      throw new HttpError(403, 'Requester is not part of this conversation');
    }

    const anchor = await messageRepository.findById(lastReadMessageId);
    if (!anchor || anchor.conversationId !== conversationId) {
      throw new HttpError(404, 'Message not found');
    }

    const ids = await messageRepository.findIncomingMessagesUpTo(
      conversationId,
      anchor.createdAt,
      viewerId,
    );

    if (ids.length === 0) {
      return;
    }

    await messageReceiptRepository.markRead(conversationId, viewerId, ids);
    await publishReceiptUpdates(conversationId, viewerId, ids, 'read');
  },

  /**
   * Legacy: presence-filtered fan-out. Prefer {@link recordPushDeliveryAck} or client `notify-received`.
   */
  async markRecipientsNotified(
    conversationId: string,
    messageId: string,
    recipientUserIds: string[],
  ): Promise<void> {
    const conversation = await conversationService.getConversationById(conversationId);
    const msg = await messageRepository.findById(messageId);
    if (!msg || msg.conversationId !== conversationId) {
      throw new HttpError(404, 'Message not found');
    }

    const unique = Array.from(new Set(recipientUserIds));
    for (const uid of unique) {
      if (!conversation.participantIds.includes(uid)) {
        throw new HttpError(400, 'Invalid recipient');
      }
      if (uid === msg.senderId) {
        throw new HttpError(400, 'Invalid recipient');
      }
    }

    const onlineIds = await presenceRepository.filterOnlineUserIds(unique);
    if (onlineIds.length === 0) {
      return;
    }

    await Promise.all(
      onlineIds.map((uid) => messageReceiptRepository.markNotified(conversationId, uid, [messageId])),
    );
    await Promise.all(
      onlineIds.map((uid) => publishReceiptUpdates(conversationId, uid, [messageId], 'delivered')),
    );
  },

  /**
   * Notification / push layer reports that **this recipient** was reached (e.g. provider delivery receipt).
   * No presence check — the callback itself is the proof.
   */
  async recordPushDeliveryAck(
    conversationId: string,
    messageId: string,
    recipientUserId: string,
  ): Promise<void> {
    const conversation = await conversationService.getConversationById(conversationId);
    const msg = await messageRepository.findById(messageId);
    if (!msg || msg.conversationId !== conversationId) {
      throw new HttpError(404, 'Message not found');
    }
    if (!conversation.participantIds.includes(recipientUserId)) {
      throw new HttpError(400, 'Invalid recipient');
    }
    if (recipientUserId === msg.senderId) {
      throw new HttpError(400, 'Invalid recipient');
    }

    await messageReceiptRepository.markNotified(conversationId, recipientUserId, [messageId]);
    await publishReceiptUpdates(conversationId, recipientUserId, [messageId], 'delivered');
  },
};
