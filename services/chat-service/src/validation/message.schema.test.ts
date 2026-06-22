import { describe, expect, it } from 'vitest';

import { createMessageBodySchema } from '@/validation/message.schema';

describe('createMessageBodySchema', () => {
  it('accepts text-only messages', () => {
    const parsed = createMessageBodySchema.parse({ body: 'hello' });
    expect(parsed.body).toBe('hello');
  });

  it('accepts attachment-only messages', () => {
    const parsed = createMessageBodySchema.parse({
      body: '',
      attachments: [
        {
          mediaId: '550e8400-e29b-41d4-a716-446655440000',
          mimeType: 'image/png',
          filename: 'photo.png',
        },
      ],
    });
    expect(parsed.attachments).toHaveLength(1);
  });

  it('rejects empty text without attachments', () => {
    const result = createMessageBodySchema.safeParse({ body: '   ' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid attachment mediaId', () => {
    const result = createMessageBodySchema.safeParse({
      body: '',
      attachments: [{ mediaId: 'not-a-uuid' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects more than 10 attachments', () => {
    const attachments = Array.from({ length: 11 }, (_, i) => ({
      mediaId: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
    }));
    const result = createMessageBodySchema.safeParse({ body: '', attachments });
    expect(result.success).toBe(false);
  });
});
