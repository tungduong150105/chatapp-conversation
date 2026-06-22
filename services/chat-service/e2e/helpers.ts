export const TEST_INTERNAL_TOKEN = 'supersecret_internal_token_12345';

export const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440000';

export const TEST_CONVERSATION_ID = '660e8400-e29b-41d4-a716-446655440001';

export const authHeaders = (userId = TEST_USER_ID) => ({
  'x-internal-token': TEST_INTERNAL_TOKEN,
  'x-user-id': userId,
});
