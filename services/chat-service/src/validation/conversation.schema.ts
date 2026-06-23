import { z } from '@chatapp/common';

export const createConversationSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    participantIds: z.array(z.string().uuid()).min(1),
    type: z.enum(['direct', 'group']).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === 'group' && !data.title?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Group conversations require a title',
        path: ['title'],
      });
    }
  });

export const listConversationsQuerySchema = z.object({
  participantId: z.string().uuid().optional(),
});
