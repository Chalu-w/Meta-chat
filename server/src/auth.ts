import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { db } from './db.js';
import { User } from './types.js';

const JWT_SECRET = process.env.JWT_SECRET || 'oromochat-super-secure-jwt-secret-key-2026';

export interface AuthRequest extends Request {
  user?: User;
}

export function generateToken(user: User): string {
  return jwt.sign(
    {
      id: user.id,
      phone: user.phone,
      username: user.username,
      displayName: user.displayName,
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authorization header missing or invalid' });
    return;
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);

  if (!decoded || !decoded.id) {
    res.status(401).json({ error: 'Token expired or invalid' });
    return;
  }

  const user = db.getUserById(decoded.id);
  if (!user) {
    res.status(401).json({ error: 'User no longer exists' });
    return;
  }

  const { passwordHash, ...safeUser } = user;
  req.user = safeUser;
  next();
}
