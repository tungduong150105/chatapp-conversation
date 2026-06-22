import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { NextFunction, Request, Response } from 'express';

import { HttpError } from '../errors/http-error';
import { validateRequest } from './validate-request';

const testErrorHandler = (err: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (err instanceof HttpError) {
    res.status(err.statusCode).json({ message: err.message, details: err.details });
    return;
  }
  next(err);
};

describe('validateRequest', () => {
  const bodySchema = z.object({
    name: z.string().min(1),
  });

  const app = express();
  app.use(express.json());
  app.post('/items', validateRequest({ body: bodySchema }), (_req, res) => {
    res.status(201).json({ ok: true });
  });
  app.use(testErrorHandler);

  it('passes valid body to the handler', async () => {
    const res = await request(app).post('/items').send({ name: 'widget' });
    expect(res.status).toBe(201);
  });

  it('returns 422 for invalid body', async () => {
    const res = await request(app).post('/items').send({ name: '' });
    expect(res.status).toBe(422);
    expect(res.body.message).toBe('Validation Error');
    expect(res.body.details?.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: 'name' })]),
    );
  });
});
