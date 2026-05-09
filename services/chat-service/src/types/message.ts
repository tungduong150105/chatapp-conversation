export type MessageReceiptStatus = 'sent' | 'delivered' | 'read';

export interface Reaction {
  emoji: string;
  userId: string;
  createdAt: Date;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: Date;
  reactions: Reaction[];
  /**
   * Outgoing only: sent (no `notifiedAt` on anyone) → delivered (≥1 notified, no reads) → read (≥1 read / seen).
   */
  receiptStatus?: MessageReceiptStatus;
}

export interface CreateMessageInput {
  conversationId: string;
  senderId: string;
  body: string;
}

export interface MessageListOptions {
  limit?: number;
  after?: Date;
}

export interface AddReactionInput {
  messageId: string;
  conversationId: string;
  userId: string;
  emoji: string;
}

export interface RemoveReactionInput {
  messageId: string;
  conversationId: string;
  userId: string;
  emoji: string;
}
