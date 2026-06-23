import { describe, expect, it } from 'vitest';

import { buildDirectKey } from '@/lib/direct-key';

describe('buildDirectKey', () => {
  it('is order-independent', () => {
    const a = '550e8400-e29b-41d4-a716-446655440000';
    const b = '660e8400-e29b-41d4-a716-446655440001';
    expect(buildDirectKey(a, b)).toBe(buildDirectKey(b, a));
  });
});
