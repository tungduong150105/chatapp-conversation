import { z } from '@chatapp/common';

export const messageAttachmentSchema = z.object({
  mediaId: z.string().uuid(),
  mimeType: z.string().max(200).optional(),
  filename: z.string().max(500).optional(),
});

export const createMessageBodySchema = z
  .object({
    body: z.string().max(2000).default(''),
    attachments: z.array(messageAttachmentSchema).max(10).optional(),
  })
  .refine(
    (data) => data.body.trim().length > 0 || (data.attachments?.length ?? 0) > 0,
    { message: 'Message must include text or at least one attachment' },
  );

export const listMessagesQuerySchema = z.object({
  limit: z
    .preprocess(
      (value) => (value === undefined ? undefined : Number(value)),
      z.number().int().min(1).max(200),
    )
    .optional(),
  after: z.string().datetime().optional(),
});

export const markDeliveredBodySchema = z.object({
  messageIds: z.array(z.string().uuid()).min(1).max(200),
});

export const markNotifyReceivedBodySchema = z.object({
  messageIds: z.array(z.string().uuid()).min(1).max(200),
});

export const markReadBodySchema = z.object({
  lastReadMessageId: z.string().uuid(),
});
