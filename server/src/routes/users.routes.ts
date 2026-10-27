import { Router, Response } from 'express';
import { db } from '../db.js';
import { authenticate, AuthRequest } from '../auth.js';
import { broadcastPresence } from '../websocket.js';

export const usersRouter = Router();

// Search users
usersRouter.get('/search', authenticate, (req: AuthRequest, res: Response) => {
  const query = (req.query.q as string) || '';
  const currentUserId = req.user!.id;
  const users = db.searchUsers(query, currentUserId);
  res.json({ users });
});

// Get user profile by id
usersRouter.get('/:id', authenticate, (req: AuthRequest, res: Response) => {
  const user = db.getUserById(req.params.id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  const { passwordHash, ...safeUser } = user;
  res.json({ user: safeUser });
});

// Update profile
usersRouter.put('/profile', authenticate, (req: AuthRequest, res: Response) => {
  const currentUserId = req.user!.id;
  const { displayName, bio, avatarUrl, language, theme, notificationsEnabled, privacyLastSeen } = req.body;

  const updated = db.updateUser(currentUserId, {
    ...(displayName && { displayName }),
    ...(bio !== undefined && { bio }),
    ...(avatarUrl && { avatarUrl }),
    ...(language && { language }),
    ...(theme && { theme }),
    ...(notificationsEnabled !== undefined && { notificationsEnabled }),
    ...(privacyLastSeen && { privacyLastSeen }),
  });

  if (!updated) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  // Update presence or notify if needed
  if (updated.status) {
    broadcastPresence(currentUserId, updated.status, updated.lastSeen);
  }

  res.json({ success: true, user: updated });
});
