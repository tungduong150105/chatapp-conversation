import type { Document, WithId } from 'mongodb';

import { getMongoClient } from '@/clients/mongo.client';

const COLLECTION = 'message_receipts';

export type MessageReceiptRecord = {
  messageId: string;
  userId: string;
  conversationId: string;
  /** Recipient was reached via notification pipeline (notify logged / push enqueued). */
  notifiedAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
};

const toRecord = (doc: WithId<Document>): MessageReceiptRecord => ({
  messageId: String(doc.messageId),
  userId: String(doc.userId),
  conversationId: String(doc.conversationId),
  notifiedAt: doc.notifiedAt ? new Date(doc.notifiedAt as string | number | Date) : undefined,
  deliveredAt: doc.deliveredAt ? new Date(doc.deliveredAt as string | number | Date) : undefined,
  readAt: doc.readAt ? new Date(doc.readAt as string | number | Date) : undefined,
});

let indexesEnsured = false;

const ensureIndexes = async () => {
  if (indexesEnsured) {
    return;
  }
  const client = await getMongoClient();
  const collection = client.db().collection(COLLECTION);
  await collection.createIndex({ messageId: 1, userId: 1 }, { unique: true });
  indexesEnsured = true;
};

export const messageReceiptRepository = {
  async findForMessagesAndUsers(
    messageIds: string[],
    recipientUserIds: string[],
  ): Promise<MessageReceiptRecord[]> {
    if (messageIds.length === 0 || recipientUserIds.length === 0) {
      return [];
    }
    await ensureIndexes();
    const client = await getMongoClient();
    const docs = await client
      .db()
      .collection(COLLECTION)
      .find({
        messageId: { $in: messageIds },
        userId: { $in: recipientUserIds },
      })
      .toArray();
    return docs.map((d) => toRecord(d as WithId<Document>));
  },

  async markDelivered(
    conversationId: string,
    viewerId: string,
    messageIds: string[],
  ): Promise<void> {
    if (messageIds.length === 0) {
      return;
    }
    await ensureIndexes();
    const client = await getMongoClient();
    const collection = client.db().collection(COLLECTION);
    const now = new Date();
    const ops = messageIds.map((messageId) => ({
      updateOne: {
        filter: { messageId, userId: viewerId },
        update: {
          $set: { deliveredAt: now },
          $setOnInsert: { messageId, userId: viewerId, conversationId },
        },
        upsert: true,
      },
    }));
    await collection.bulkWrite(ops);
  },

  async markNotified(
    conversationId: string,
    recipientUserId: string,
    messageIds: string[],
  ): Promise<void> {
    if (messageIds.length === 0) {
      return;
    }
    await ensureIndexes();
    const client = await getMongoClient();
    const collection = client.db().collection(COLLECTION);
    const now = new Date();
    const ops = messageIds.map((messageId) => ({
      updateOne: {
        filter: { messageId, userId: recipientUserId },
        update: {
          $set: { notifiedAt: now },
          $setOnInsert: { messageId, userId: recipientUserId, conversationId },
        },
        upsert: true,
      },
    }));
    await collection.bulkWrite(ops);
  },

  async markRead(conversationId: string, viewerId: string, messageIds: string[]): Promise<void> {
    if (messageIds.length === 0) {
      return;
    }
    await ensureIndexes();
    const client = await getMongoClient();
    const collection = client.db().collection(COLLECTION);
    const now = new Date();
    const ops = messageIds.map((messageId) => ({
      updateOne: {
        filter: { messageId, userId: viewerId },
        update: {
          $set: { readAt: now, notifiedAt: now },
          $setOnInsert: { messageId, userId: viewerId, conversationId },
        },
        upsert: true,
      },
    }));
    await collection.bulkWrite(ops);
  },
};
