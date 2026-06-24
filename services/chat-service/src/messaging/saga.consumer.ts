/**
 * Saga Consumer — Chat Service subscribes to downstream saga events
 * to update message delivery state and handle compensation.
 *
 * Saga flow:
 *   message.created → (Notification) notification.created
 *                   → (Realtime)     message.delivered
 *   On failure:     → (any service)  message.failed → compensation here
 */
import { connect, type Channel, type ChannelModel, type ConsumeMessage } from 'amqplib';
import {
  CONVERSATION_EVENTS_EXCHANGE,
  MESSAGE_DELIVERED_ROUTING_KEY,
  MESSAGE_FAILED_ROUTING_KEY,
  NOTIFICATION_CREATED_ROUTING_KEY,
  type MessageDeliveredEvent,
  type MessageFailedEvent,
  type NotificationCreatedEvent,
} from '@chatapp/common';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';
import { messageRepository } from '@/repositories/message.repository';

const SAGA_CONSUMER_QUEUE = 'chat-service.saga-events';

let connection: ChannelModel | null = null;
let channel: Channel | null = null;
let consumerTag: string | null = null;

const handleNotificationCreated = async (event: NotificationCreatedEvent): Promise<void> => {
  logger.info(
    { sagaId: event.payload.sagaId, messageId: event.payload.messageId },
    'Saga: notification.created received — updating sagaStatus to notified',
  );
  await messageRepository.updateSagaStatus(event.payload.messageId, 'notified');
};

const handleMessageDelivered = async (event: MessageDeliveredEvent): Promise<void> => {
  logger.info(
    { sagaId: event.payload.sagaId, messageId: event.payload.messageId },
    'Saga: message.delivered received — updating sagaStatus to delivered',
  );
  await messageRepository.updateSagaStatus(event.payload.messageId, 'delivered');
};

const handleMessageFailed = async (event: MessageFailedEvent): Promise<void> => {
  const { sagaId, messageId, failedStep, reason } = event.payload;
  logger.warn(
    { sagaId, messageId, failedStep, reason },
    'Saga: message.failed received — executing compensation',
  );
  // Compensation: mark message as failed so sender knows delivery did not complete
  await messageRepository.updateSagaStatus(messageId, 'failed');
};

const dispatch = async (msg: ConsumeMessage, ch: Channel): Promise<void> => {
  const raw = msg.content.toString('utf-8');
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const event = JSON.parse(raw);
  const type = (event as { type?: string }).type;

  if (type === NOTIFICATION_CREATED_ROUTING_KEY) {
    await handleNotificationCreated(event as NotificationCreatedEvent);
  } else if (type === MESSAGE_DELIVERED_ROUTING_KEY) {
    await handleMessageDelivered(event as MessageDeliveredEvent);
  } else if (type === MESSAGE_FAILED_ROUTING_KEY) {
    await handleMessageFailed(event as MessageFailedEvent);
  } else {
    logger.warn({ type }, 'Saga consumer: unknown event type, skipping');
  }

  ch.ack(msg);
};

export const startSagaConsumer = async (): Promise<void> => {
  if (!env.RABBITMQ_URL || !env.ENABLE_EVENT_PUBLISH) {
    logger.info('Saga consumer disabled (no RABBITMQ_URL or ENABLE_EVENT_PUBLISH=false)');
    return;
  }

  const conn = await connect(env.RABBITMQ_URL);
  connection = conn;
  const ch = await conn.createChannel();
  channel = ch;

  await ch.assertExchange(CONVERSATION_EVENTS_EXCHANGE, 'topic', { durable: true });
  const queue = await ch.assertQueue(SAGA_CONSUMER_QUEUE, { durable: true });

  for (const key of [NOTIFICATION_CREATED_ROUTING_KEY, MESSAGE_DELIVERED_ROUTING_KEY, MESSAGE_FAILED_ROUTING_KEY]) {
    await ch.bindQueue(queue.queue, CONVERSATION_EVENTS_EXCHANGE, key);
  }

  const result = await ch.consume(queue.queue, (msg) => {
    if (!msg) return;
    void dispatch(msg, ch).catch((err: unknown) => {
      logger.error({ err }, 'Saga consumer: failed to process event');
      ch.nack(msg, false, false);
    });
  });

  consumerTag = result.consumerTag;
  logger.info('Saga consumer started');
};

export const stopSagaConsumer = async (): Promise<void> => {
  try {
    if (channel && consumerTag) {
      await channel.cancel(consumerTag);
      consumerTag = null;
    }
    if (channel) {
      await channel.close();
      channel = null;
    }
    if (connection) {
      await connection.close();
      connection = null;
    }
  } catch (err) {
    logger.error({ err }, 'Error stopping saga consumer');
  }
};
