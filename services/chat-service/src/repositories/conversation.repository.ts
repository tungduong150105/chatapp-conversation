import { randomUUID } from 'node:crypto';
import { ObjectId } from 'mongodb';
import type { WithId, Document } from 'mongodb';

import type {
  Conversation,
  ConversationFilter,
  ConversationSummary,
  ConversationType,
  CreateConversationInput,
} from '@/types/conversation';

import { getMongoClient } from '@/clients/mongo.client';
import { buildDirectKey } from '@/lib/direct-key';

const CONVERSATIONS_COLLECTION = 'conversations';
const MESSAGES_COLLECTION = 'messages';

const inferType = (participantIds: string[], explicit?: ConversationType): ConversationType => {
  if (explicit) {
    return explicit;
  }
  return participantIds.length === 2 ? 'direct' : 'group';
};

const toConversation = (doc: WithId<Document>): Conversation => {
  const participantIds = Array.isArray(doc.participantIds) ? (doc.participantIds as string[]) : [];
  const type = (doc.type as ConversationType | undefined) ?? inferType(participantIds);
  return {
    id: String(doc._id),
    type,
    title: typeof doc.title === 'string' ? doc.title : null,
    participantIds,
    createdBy: typeof doc.createdBy === 'string' ? doc.createdBy : participantIds[0] ?? '',
    directKey: typeof doc.directKey === 'string' ? doc.directKey : null,
    createdAt: new Date(doc.createdAt as string | number | Date),
    updatedAt: new Date(doc.updatedAt as string | number | Date),
    lastMessageAt: doc.lastMessageAt ? new Date(doc.lastMessageAt as string | number | Date) : null,
    lastMessagePreview: typeof doc.lastMessagePreview === 'string' ? doc.lastMessagePreview : null,
  };
};

const toConversationSummary = (doc: WithId<Document>): ConversationSummary => toConversation(doc);

export const conversationRepository = {
  async ensureIndexes(): Promise<void> {
    const client = await getMongoClient();
    const collection = client.db().collection(CONVERSATIONS_COLLECTION);
    await collection.createIndex(
      { directKey: 1 },
      { unique: true, sparse: true, name: 'conversations_directKey_unique' },
    );
  },

  async findByDirectKey(directKey: string): Promise<Conversation | null> {
    const client = await getMongoClient();
    const db = client.db();
    const doc = await db.collection(CONVERSATIONS_COLLECTION).findOne({ directKey });
    return doc ? toConversation(doc as WithId<Document>) : null;
  },

  async findLegacyDirect(idA: string, idB: string): Promise<Conversation | null> {
    const client = await getMongoClient();
    const doc = await client.db().collection(CONVERSATIONS_COLLECTION).findOne({
      participantIds: { $all: [idA, idB], $size: 2 },
      $and: [
        { $or: [{ type: 'direct' }, { type: { $exists: false } }] },
        { $or: [{ directKey: { $exists: false } }, { directKey: null }] },
      ],
    });
    return doc ? toConversation(doc as WithId<Document>) : null;
  },

  async setDirectKey(conversationId: string, directKey: string): Promise<void> {
    const client = await getMongoClient();
    await client.db().collection(CONVERSATIONS_COLLECTION).updateOne(
      { _id: conversationId as unknown as ObjectId },
      { $set: { directKey, type: 'direct', updatedAt: new Date() } },
    );
  },

  async findOrCreateDirect(
    input: CreateConversationInput,
  ): Promise<{ conversation: Conversation; created: boolean }> {
    const [idA, idB] = input.participantIds;
    const directKey = buildDirectKey(idA, idB);

    const legacy = await this.findLegacyDirect(idA, idB);
    if (legacy) {
      if (!legacy.directKey) {
        await this.setDirectKey(legacy.id, directKey);
        legacy.directKey = directKey;
      }
      return { conversation: legacy, created: false };
    }

    const now = new Date();
    const newId = randomUUID();
    const client = await getMongoClient();
    const collection = client.db().collection(CONVERSATIONS_COLLECTION);

    const result = await collection.findOneAndUpdate(
      { directKey },
      {
        $setOnInsert: {
          _id: newId,
          type: 'direct',
          title: null,
          participantIds: input.participantIds,
          createdBy: input.createdBy,
          directKey,
          createdAt: now,
          updatedAt: now,
          lastMessageAt: null,
          lastMessagePreview: null,
        },
      },
      { upsert: true, returnDocument: 'after', includeResultMetadata: true },
    );

    if (!result.value) {
      const existing = await this.findByDirectKey(directKey);
      if (existing) {
        return { conversation: existing, created: false };
      }
      throw new Error('Failed to find or create direct conversation');
    }

    const created = result.lastErrorObject?.updatedExisting === false;
    return { conversation: toConversation(result.value as WithId<Document>), created };
  },

  async create(input: CreateConversationInput): Promise<Conversation> {
    const client = await getMongoClient();
    const db = client.db();
    const collection = db.collection(CONVERSATIONS_COLLECTION);
    const now = new Date();
    const type = inferType(input.participantIds, input.type);
    const directKey =
      type === 'direct' && input.participantIds.length === 2
        ? buildDirectKey(input.participantIds[0]!, input.participantIds[1]!)
        : null;

    const document = {
      _id: randomUUID(),
      type,
      title: input.title ?? null,
      participantIds: input.participantIds,
      createdBy: input.createdBy,
      directKey,
      createdAt: now,
      updatedAt: now,
      lastMessageAt: null,
      lastMessagePreview: null,
    };

    await collection.insertOne(document as unknown as Document);
    return toConversation(document as unknown as WithId<Document>);
  },

  async findById(id: string): Promise<Conversation | null> {
    const client = await getMongoClient();
    const db = client.db();
    const doc = await db
      .collection(CONVERSATIONS_COLLECTION)
      .findOne({ _id: id as unknown as ObjectId });
    return doc ? toConversation(doc) : null;
  },

  async findSummaries(filter: ConversationFilter): Promise<ConversationSummary[]> {
    const client = await getMongoClient();
    const db = client.db();
    const cursor = db
      .collection(CONVERSATIONS_COLLECTION)
      .find({ participantIds: filter.participantId })
      .sort({ lastMessageAt: -1, updatedAt: -1 });
    const results = await cursor.toArray();
    return results.map((doc) => toConversationSummary(doc));
  },

  async touchConversation(
    conversationId: string,
    preview: string,
    /** Align with the message row so clients can compare `lastMessageAt` to read receipts. */
    lastMessageAt: Date,
  ): Promise<void> {
    const client = await getMongoClient();
    const db = client.db();
    await db.collection(CONVERSATIONS_COLLECTION).updateOne(
      { _id: conversationId as unknown as ObjectId },
      {
        $set: {
          lastMessageAt,
          lastMessagePreview: preview,
          updatedAt: new Date(),
        },
      },
    );
  },

  async removeAll(): Promise<void> {
    const client = await getMongoClient();
    const db = client.db();
    await Promise.all([
      db.collection(CONVERSATIONS_COLLECTION).deleteMany({}),
      db.collection(MESSAGES_COLLECTION).deleteMany({}),
    ]);
  },
};
