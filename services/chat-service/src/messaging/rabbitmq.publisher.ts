import { env } from '@/config/env';
import { logger } from '@/utils/logger';
import {
  CONVERSATION_EVENTS_EXCHANGE,
  MESSAGE_CREATED_ROUTING_KEY,
  type MessageCreatedEvent,
} from '@chatapp/common';

import { connect, type Channel, type ChannelModel } from 'amqplib';

let publishConnection: ChannelModel | null = null;
let publishChannel: Channel | null = null;

export const startPublisher = async (): Promise<void> => {
  if (!env.RABBITMQ_URL || !env.ENABLE_EVENT_PUBLISH) {
    logger.info('RabbitMQ event publisher disabled');
    return;
  }

  const conn = await connect(env.RABBITMQ_URL);
  publishConnection = conn;
  const ch = await conn.createChannel();
  publishChannel = ch;

  await ch.assertExchange(CONVERSATION_EVENTS_EXCHANGE, 'topic', { durable: true });
  logger.info('RabbitMQ event publisher ready');
};

export const publishMessageCreated = (event: MessageCreatedEvent): void => {
  if (!publishChannel || !env.ENABLE_EVENT_PUBLISH || !env.RABBITMQ_URL) {
    return;
  }

  try {
    const buf = Buffer.from(JSON.stringify(event), 'utf-8');
    publishChannel.publish(
      CONVERSATION_EVENTS_EXCHANGE,
      MESSAGE_CREATED_ROUTING_KEY,
      buf,
      { persistent: true, contentType: 'application/json' },
    );
  } catch (error: unknown) {
    logger.error({ err: error }, 'Failed to publish message.created event; message was still saved');
  }
};

export const stopPublisher = async (): Promise<void> => {
  try {
    const ch = publishChannel;
    if (ch) {
      await ch.close();
      publishChannel = null;
    }
    const conn = publishConnection;
    if (conn) {
      await conn.close();
      publishConnection = null;
    }
  } catch (error: unknown) {
    logger.error({ err: error }, 'Error stopping RabbitMQ publisher');
  }
};
