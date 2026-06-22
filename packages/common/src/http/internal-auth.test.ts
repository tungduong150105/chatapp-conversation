import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createInternalAuthMiddleware } from './internal-auth';

const TOKEN = 'test-internal-token';

const appWithAuth = () => {
  const app = express();
  app.use(
    createInternalAuthMiddleware(TOKEN, {
      exemptPaths: ['/health'],
    }),
  );
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });
  app.get('/protected', (_req, res) => {
    res.status(200).json({ ok: true });
  });
  return app;
};

describe('createInternalAuthMiddleware', () => {
  it('allows exempt paths without a token', async () => {
    const res = await request(appWithAuth()).get('/health');
    expect(res.status).toBe(200);
  });

  it('rejects protected routes without a token', async () => {
    const res = await request(appWithAuth()).get('/protected');
    expect(res.status).toBe(401);
  });

  it('rejects protected routes with a wrong token', async () => {
    const res = await request(appWithAuth())
      .get('/protected')
      .set('x-internal-token', 'wrong');
    expect(res.status).toBe(401);
  });

  it('allows protected routes with the correct token', async () => {
    const res = await request(appWithAuth())
      .get('/protected')
      .set('x-internal-token', TOKEN);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});
