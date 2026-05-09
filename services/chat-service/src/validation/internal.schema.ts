import { z } from '@chatapp/common';

export const markNotifiedInternalBodySchema = z.object({
  messageId: z.string().uuid(),
  recipientUserIds: z.array(z.string().uuid()).min(1),
});

/** Single-recipient ack from the push pipeline (FCM/APNs delivery receipt, etc.). */
export const deliveryAckInternalBodySchema = z.object({
  messageId: z.string().uuid(),
  recipientUserId: z.string().uuid(),
});
