import { asyncHandler } from '@chatapp/common';
import type { RequestHandler } from 'express';

import { getAuthenticatedUser } from '@/utils/auth';
import { presenceRepository } from '@/repositories/presence.repository';

export const touchPresenceHandler: RequestHandler = asyncHandler(async (req, res) => {
  const user = getAuthenticatedUser(req);
  await presenceRepository.touch(user.id);
  res.status(204).send();
});

export const clearPresenceHandler: RequestHandler = asyncHandler(async (req, res) => {
  const user = getAuthenticatedUser(req);
  await presenceRepository.clear(user.id);
  res.status(204).send();
});
