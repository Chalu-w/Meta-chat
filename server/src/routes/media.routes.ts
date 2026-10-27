import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../auth.js';

export const mediaRouter = Router();

// Simulated / direct media upload endpoint (supports base64 audio/images or direct URLs)
mediaRouter.post('/upload', authenticate, (req: AuthRequest, res: Response) => {
  const { type, data, fileName, duration } = req.body;

  if (!data) {
    res.status(400).json({ error: 'Data is required for media upload' });
    return;
  }

  // In production, configure AWS S3 / Cloudinary / MinIO or local disk storage.
  // We return the base64 or stored payload URL directly for instant reliable operation.
  const mediaUrl = data.startsWith('http') || data.startsWith('data:')
    ? data
    : `data:${type === 'voice' ? 'audio/webm' : 'image/png'};base64,${data}`;

  res.json({
    success: true,
    mediaUrl,
    fileName: fileName || (type === 'voice' ? 'Sagalee_OromoChat.webm' : 'Suuraa_OromoChat.png'),
    duration: duration || (type === 'voice' ? 5 : undefined),
    externalConfigNote: 'In production, connect AWS S3 bucket or MinIO storage provider.',
  });
});
