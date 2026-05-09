import type { Document, WithId } from 'mongodb';

import { getMongoClient } from '@/clients/mongo.client';

const COLLECTION = 'user_presence';

/** If `lastSeenAt` is newer than this, we treat the user as online for notification receipt fan-out. */
export const PRESENCE_ONLINE_WINDOW_MS = 75_000;

let indexesEnsured = false;

const ensureIndexes = async () => {
  if (indexesEnsured) {
    return;
  }
  const client = await getMongoClient();
  await client.db().collection(COLLECTION).createIndex({ userId: 1 }, { unique: true });
  indexesEnsured = true;
};

export const presenceRepository = {
  async touch(userId: string): Promise<void> {
    await ensureIndexes();
    const client = await getMongoClient();
    const now = new Date();
    await client
      .db()
      .collection(COLLECTION)
      .updateOne({ userId }, { $set: { userId, lastSeenAt: now } }, { upsert: true });
  },

  /** User IDs seen within the online window (heartbeat from chat-ui). */
  async filterOnlineUserIds(userIds: string[]): Promise<string[]> {
    if (userIds.length === 0) {
      return [];
    }
    await ensureIndexes();
    const client = await getMongoClient();
    const threshold = new Date(Date.now() - PRESENCE_ONLINE_WINDOW_MS);
    const docs = await client
      .db()
      .collection(COLLECTION)
      .find({
        userId: { $in: userIds },
        lastSeenAt: { $gte: threshold },
      })
      .toArray();
    const online = new Set(docs.map((d) => String((d as WithId<Document>).userId)));
    return userIds.filter((id) => online.has(id));
  },

  /** Remove row so notification fan-out no longer treats this user as recently active (e.g. dev tab switched UUID). */
  async clear(userId: string): Promise<void> {
    await ensureIndexes();
    const client = await getMongoClient();
    await client.db().collection(COLLECTION).deleteOne({ userId });
  },
};
