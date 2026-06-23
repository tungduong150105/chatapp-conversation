import { randomUUID } from 'node:crypto';

import { type WithId, type Document } from 'mongodb';

import type { Message, MessageAttachment, MessageListOptions } from '@/types/message';

import { getMongoClient } from '@/clients/mongo.client';

const MESSAGES_COLLECTION = 'messages';

const toAttachment = (raw: unknown): MessageAttachment | null => {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const o = raw as Record<string, unknown>;
  if (typeof o.mediaId !== 'string') {
    return null;
  }
  return {
    mediaId: o.mediaId,
    mimeType: typeof o.mimeType === 'string' ? o.mimeType : undefined,
    filename: typeof o.filename === 'string' ? o.filename : undefined,
  };
};

const toMessage = (doc: WithId<Document>): Message => ({
  id: String(doc._id),
  conversationId: String(doc.conversationId),
  senderId: String(doc.senderId),
  body: String(doc.body ?? ''),
  createdAt: new Date(doc.createdAt as string | number | Date),
  reactions: Array.isArray(doc.reactions)
    ? doc.reactions.map((r: WithId<Document>) => ({
      emoji: String(r.emoji),
      userId: String(r.userId),
      createdAt: new Date(r.createdAt as string | number | Date),
    }))
    : [],
  attachments: Array.isArray(doc.attachments)
    ? doc.attachments.map(toAttachment).filter((a): a is MessageAttachment => a !== null)
    : undefined,
});

export type SagaStatus = 'pending' | 'notified' | 'delivered' | 'failed';

export const messageRepository = {
<<<<<<< HEAD
  async create(
    conversationId: string,
    senderId: string,
    body: string,
    attachments?: MessageAttachment[],
  ): Promise<Message> {
=======
  async updateSagaStatus(messageId: string, status: SagaStatus): Promise<void> {
    const client = await getMongoClient();
    await client.db().collection(MESSAGES_COLLECTION).updateOne(
      { _id: messageId } as unknown as Document,
      { $set: { sagaStatus: status, sagaUpdatedAt: new Date() } },
    );
  },

  async create(conversationId: string, senderId: string, body: string): Promise<Message> {
>>>>>>> 3134bd3 (feat(chat): add gRPC client, Saga choreography, and CI/CD pipeline
)
    const client = await getMongoClient();
    const db = client.db();
    const collection = db.collection(MESSAGES_COLLECTION);
    const now = new Date();
    const document: Record<string, unknown> = {
      _id: randomUUID(),
      conversationId,
      senderId,
      body,
      createdAt: now,
    };
    if (attachments && attachments.length > 0) {
      document.attachments = attachments;
    }

    await collection.insertOne(document as unknown as Document);

    return toMessage(document as unknown as WithId<Document>);
  },

  async findByConversation(
    conversationId: string,
    options: MessageListOptions = {},
  ): Promise<Message[]> {
    const client = await getMongoClient();
    const db = client.db();
    const query: Record<string, unknown> = {
      conversationId,
    };
    if (options.after) {
      query.createdAt = { $gt: options.after };
    }

    const cursor = db
      .collection(MESSAGES_COLLECTION)
      .find(query)
      .sort({ createdAt: -1 })
      .limit(options.limit ?? 50);

    const messages = await cursor.toArray();
    return messages.map((doc) => toMessage(doc));
  },

  async findById(messageId: string): Promise<Message | null> {
    const client = await getMongoClient();
    const db = client.db();
    const doc = await db
      .collection(MESSAGES_COLLECTION)
      .findOne({ _id: messageId } as unknown as Document);
    return doc ? toMessage(doc) : null;
  },

  async findIncomingMessagesUpTo(
    conversationId: string,
    beforeInclusive: Date,
    viewerId: string,
  ): Promise<string[]> {
    const client = await getMongoClient();
    const db = client.db();
    const docs = await db
      .collection(MESSAGES_COLLECTION)
      .find({
        conversationId,
        createdAt: { $lte: beforeInclusive },
        senderId: { $ne: viewerId },
      })
      .project({ _id: 1 })
      .toArray();
    return docs.map((d) => String(d._id));
  },
};
