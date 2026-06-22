import { describe, expect, it } from 'vitest';

import {
  createConversationSchema,
  listConversationsQuerySchema,
} from '@/validation/conversation.schema';

describe('createConversationSchema', () => {
  it('accepts participant ids with optional title', () => {
    const parsed = createConversationSchema.parse({
      title: 'Team chat',
      participantIds: ['550e8400-e29b-41d4-a716-446655440000'],
    });
    expect(parsed.title).toBe('Team chat');
  });

  it('rejects empty participant list', () => {
    const result = createConversationSchema.safeParse({ participantIds: [] });
    expect(result.success).toBe(false);
  });

  it('rejects non-uuid participant ids', () => {
    const result = createConversationSchema.safeParse({
      participantIds: ['not-a-uuid'],
    });
    expect(result.success).toBe(false);
  });
});

describe('listConversationsQuerySchema', () => {
  it('accepts optional participantId filter', () => {
    const parsed = listConversationsQuerySchema.parse({
      participantId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(parsed.participantId).toBeDefined();
  });

  it('accepts empty query', () => {
    const parsed = listConversationsQuerySchema.parse({});
    expect(parsed.participantId).toBeUndefined();
  });
});
