import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '@/app';

import { authHeaders, TEST_CONVERSATION_ID } from './helpers';

describe('chat-service e2e', () => {
  const app = createApp();

  it('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', service: 'chat-service' });
  });

  it('GET /conversations without auth returns 401', async () => {
    const res = await request(app).get('/conversations');
    expect(res.status).toBe(401);
  });

  it('GET /conversations with token but no user id returns 401', async () => {
    const res = await request(app)
      .get('/conversations')
      .set('x-internal-token', authHeaders()['x-internal-token']);
    expect(res.status).toBe(401);
  });

  it('GET /conversations with invalid user id returns 401', async () => {
    const res = await request(app)
      .get('/conversations')
      .set(authHeaders('not-a-uuid'));
    expect(res.status).toBe(401);
  });

  it('POST /conversations/:id/messages rejects empty message with 422', async () => {
    const res = await request(app)
      .post(`/conversations/${TEST_CONVERSATION_ID}/messages`)
      .set(authHeaders())
      .send({ body: '   ' });
    expect(res.status).toBe(422);
  });

  it('POST /conversations/:id/messages rejects invalid mediaId with 422', async () => {
    const res = await request(app)
      .post(`/conversations/${TEST_CONVERSATION_ID}/messages`)
      .set(authHeaders())
      .send({
        body: '',
        attachments: [{ mediaId: 'not-a-uuid' }],
      });
    expect(res.status).toBe(422);
  });

  it('POST /conversations with invalid participant ids returns 422', async () => {
    const res = await request(app)
      .post('/conversations')
      .set(authHeaders())
      .send({ participantIds: ['bad-id'] });
    expect(res.status).toBe(422);
  });
});
