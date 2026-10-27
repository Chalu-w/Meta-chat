import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db, UserWithPassword } from '../db.js';
import { generateToken, authenticate, AuthRequest } from '../auth.js';
import { SmsService } from '../services/sms.service.js';
import { FirebaseAuthService } from '../services/firebase-auth.service.js';

export const authRouter = Router();


// SMS status check for client UI
authRouter.get('/sms-status', (_req, res: Response) => {
  const configured = SmsService.isConfigured();
  const devSandboxAllowed = process.env.NODE_ENV !== 'production' && process.env.ALLOW_DEV_TEST_OTP === 'true';
  const devSandboxNumber = process.env.DEV_SANDBOX_TEST_NUMBER || '+251900000000';

  res.json({
    configured,
    provider: configured ? 'Twilio SMS Gateway' : 'unconfigured',
    devSandboxAllowed,
    devSandboxNumber: devSandboxAllowed ? devSandboxNumber : undefined,
  });
});

// Send OTP with phone number validation and real SMS gateway integration
authRouter.post('/send-otp', async (req, res: Response) => {
  const { phone, countryCode = '+251', localNumber } = req.body;

  // Validate number using country & carrier rules
  const validation = localNumber
    ? SmsService.validatePhoneNumber(countryCode, localNumber)
    : SmsService.validatePhoneNumber(countryCode, (phone || '').replace(countryCode, ''));

  if (!validation.isValid) {
    res.status(400).json({ error: validation.error || 'Invalid phone number format' });
    return;
  }

  const normalizedPhone = validation.e164;

  // Rate limiting check (cooldown & hourly limits)
  const rateLimit = db.canRequestOtp(normalizedPhone);
  if (!rateLimit.allowed) {
    res.status(429).json({
      error: rateLimit.error || 'Too many OTP requests. Please wait before trying again.',
      waitSeconds: rateLimit.waitSeconds,
    });
    return;
  }

  // Developer Sandbox mode for designated test numbers only
  const isDevSandbox =
    process.env.NODE_ENV !== 'production' &&
    process.env.ALLOW_DEV_TEST_OTP === 'true' &&
    normalizedPhone === (process.env.DEV_SANDBOX_TEST_NUMBER || '+251900000000');

  if (isDevSandbox) {
    db.createOtp(normalizedPhone);
    const sandboxOtp = process.env.DEV_SANDBOX_OTP || '849201';
    res.json({
      success: true,
      delivered: true,
      isSandbox: true,
      carrier: validation.carrierName,
      phone: normalizedPhone,
      message: `Development sandbox verification code active. Enter test code: ${sandboxOtp}`,
    });
    return;
  }

  // If live SMS gateway is not configured, do not pretend SMS was sent
  if (!SmsService.isConfigured()) {
    res.status(503).json({
      success: false,
      error: 'SMS verification gateway is currently not configured on this server. Please use password login or contact the administrator to configure live SMS credentials in server/.env.',
      carrier: validation.carrierName,
      configured: false,
    });
    return;
  }

  // Create real random 6-digit OTP and send via configured SMS gateway
  const code = db.createOtp(normalizedPhone);
  const smsResult = await SmsService.sendOtpSms(normalizedPhone, code);

  if (!smsResult.delivered) {
    res.status(502).json({
      success: false,
      error: smsResult.message || 'Failed to deliver SMS to your mobile network. Please verify your phone number.',
      carrier: validation.carrierName,
    });
    return;
  }

  res.json({
    success: true,
    delivered: true,
    provider: smsResult.provider,
    carrier: validation.carrierName,
    phone: normalizedPhone,
    message: `A 6-digit verification code was sent via SMS to ${normalizedPhone}.`,
  });
});

// Verify OTP
authRouter.post('/verify-otp', (req, res: Response) => {
  const { phone, code } = req.body;
  if (!phone || !code) {
    res.status(400).json({ error: 'Phone number and 6-digit OTP code are required.' });
    return;
  }

  const cleanCode = code.toString().trim();
  const verifyResult = db.verifyOtp(phone, cleanCode);

  if (!verifyResult.success) {
    res.status(400).json({ error: verifyResult.error || 'Invalid or expired 6-digit verification code.' });
    return;
  }


  const existingUser = db.getUserByPhoneOrUsername(phone);
  if (existingUser) {
    const { passwordHash, ...safeUser } = existingUser;
    const token = generateToken(safeUser);
    res.json({ success: true, user: safeUser, token, isNewUser: false });
  } else {
    // Automatically create a user profile for verified phone number if first time
    const cleanUsername = `user_${phone.replace(/\+/g, '')}`;
    const passwordHash = bcrypt.hashSync('defaultPass123', 8);
    const newUser: UserWithPassword = {
      id: `user-${uuidv4().slice(0, 8)}`,
      phone,
      username: cleanUsername,
      displayName: `User ${phone.slice(-4)}`,
      bio: 'Using Meta Chat',
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUsername}`,
      status: 'online',
      lastSeen: new Date().toISOString(),
      language: 'en',
      theme: 'telegram-dark',
      notificationsEnabled: true,
      privacyLastSeen: 'everybody',
      createdAt: new Date().toISOString(),
      passwordHash,
    };

    const safeUser = db.createUser(newUser);
    const token = generateToken(safeUser);
    res.json({ success: true, user: safeUser, token, isNewUser: true });
  }
});

// Firebase Authentication Phone Login Endpoint
authRouter.post('/firebase-login', async (req, res: Response) => {
  const { idToken, phone, displayName } = req.body;

  if (!idToken) {
    res.status(400).json({ error: 'Firebase ID token is required for authentication.' });
    return;
  }

  // Cryptographically verify Firebase ID token
  const verifyResult = await FirebaseAuthService.verifyIdToken(idToken);
  if (!verifyResult.valid) {
    res.status(401).json({ error: verifyResult.error || 'Invalid or expired Firebase authentication token.' });
    return;
  }

  const verifiedPhone = verifyResult.phoneNumber || phone;
  if (!verifiedPhone) {
    res.status(400).json({ error: 'No verified phone number found in Firebase token.' });
    return;
  }

  // Locate existing user or auto-provision verified phone account
  const firebaseUid = verifyResult.uid;
  let user = (firebaseUid ? db.getUserById(firebaseUid) : undefined) || db.getUserByPhoneOrUsername(verifiedPhone);
  let isNewUser = false;

  if (!user) {
    isNewUser = true;
    const cleanUsername = `user_${verifiedPhone.replace(/\+/g, '')}`;
    const passwordHash = bcrypt.hashSync(uuidv4(), 8);
    const newUser: UserWithPassword = {
      id: firebaseUid || `user-${uuidv4().slice(0, 8)}`,
      phone: verifiedPhone,
      username: cleanUsername,
      displayName: displayName || `User ${verifiedPhone.slice(-4)}`,
      bio: 'Using Meta Chat',
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUsername}`,
      status: 'online',
      lastSeen: new Date().toISOString(),
      language: 'en',
      theme: 'telegram-dark',
      notificationsEnabled: true,
      privacyLastSeen: 'everybody',
      createdAt: new Date().toISOString(),
      passwordHash,
    };
    user = newUser;
    db.createUser(newUser);
  } else {
    // Ensure ID is Firebase UID if present
    if (firebaseUid && user.id !== firebaseUid) {
      user.id = firebaseUid;
    }
    user.status = 'online';
    user.lastSeen = new Date().toISOString();
  }

  const { passwordHash, ...safeUser } = user;
  const token = generateToken(safeUser);

  res.json({
    success: true,
    user: safeUser,
    token,
    isNewUser,
  });
});

// Register new user
authRouter.post('/register', (req, res: Response) => {
  const { phone, username, displayName, password, bio, avatarUrl, language } = req.body;

  if (!phone || !displayName || !password) {
    res.status(400).json({ error: 'Please fill all required fields.' });
    return;
  }

  const cleanUsername = (username || displayName.toLowerCase().replace(/\s+/g, '_')).replace('@', '');

  // Check uniqueness
  if (db.getUserByPhoneOrUsername(phone)) {
    res.status(400).json({ error: 'This phone number is already registered. Please log in instead.' });
    return;
  }

  if (db.getUserByPhoneOrUsername(cleanUsername)) {
    res.status(400).json({ error: 'This username is already taken. Please choose another username.' });
    return;
  }

  const passwordHash = bcrypt.hashSync(password, 8);
  const newUser: UserWithPassword = {
    id: `user-${uuidv4().slice(0, 8)}`,
    phone,
    username: cleanUsername,
    displayName,
    bio: bio || 'Using Meta Chat',
    avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUsername}`,
    status: 'online',
    lastSeen: new Date().toISOString(),
    language: language || 'en',
    theme: 'telegram-dark',
    notificationsEnabled: true,
    privacyLastSeen: 'everybody',
    createdAt: new Date().toISOString(),
    passwordHash,
  };

  const safeUser = db.createUser(newUser);
  const token = generateToken(safeUser);

  res.status(201).json({
    success: true,
    user: safeUser,
    token,
  });
});

// Login with password
authRouter.post('/login', (req, res: Response) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    res.status(400).json({ error: 'Identifier and password are required.' });
    return;
  }

  const user = db.getUserByPhoneOrUsername(identifier);
  if (!user) {
    res.status(401).json({ error: 'User account not found.' });
    return;
  }

  const valid = bcrypt.compareSync(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: 'Incorrect password entered.' });
    return;
  }

  user.status = 'online';
  user.lastSeen = new Date().toISOString();

  const { passwordHash, ...safeUser } = user;
  const token = generateToken(safeUser);

  res.json({
    success: true,
    user: safeUser,
    token,
  });
});

// Current authenticated user
authRouter.get('/me', authenticate, (req: AuthRequest, res: Response) => {
  res.json({ user: req.user });
});
