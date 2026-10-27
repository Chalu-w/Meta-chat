"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const uuid_1 = require("uuid");
const db_js_1 = require("../db.js");
const auth_js_1 = require("../auth.js");
const sms_service_js_1 = require("../services/sms.service.js");
const firebase_auth_service_js_1 = require("../services/firebase-auth.service.js");
exports.authRouter = (0, express_1.Router)();
// SMS status check for client UI
exports.authRouter.get('/sms-status', (_req, res) => {
    const configured = sms_service_js_1.SmsService.isConfigured();
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
exports.authRouter.post('/send-otp', async (req, res) => {
    const { phone, countryCode = '+251', localNumber } = req.body;
    // Validate number using country & carrier rules
    const validation = localNumber
        ? sms_service_js_1.SmsService.validatePhoneNumber(countryCode, localNumber)
        : sms_service_js_1.SmsService.validatePhoneNumber(countryCode, (phone || '').replace(countryCode, ''));
    if (!validation.isValid) {
        res.status(400).json({ error: validation.error || 'Invalid phone number format' });
        return;
    }
    const normalizedPhone = validation.e164;
    // Rate limiting check (cooldown & hourly limits)
    const rateLimit = db_js_1.db.canRequestOtp(normalizedPhone);
    if (!rateLimit.allowed) {
        res.status(429).json({
            error: rateLimit.error || 'Too many OTP requests. Please wait before trying again.',
            waitSeconds: rateLimit.waitSeconds,
        });
        return;
    }
    // Developer Sandbox mode for designated test numbers only
    const isDevSandbox = process.env.NODE_ENV !== 'production' &&
        process.env.ALLOW_DEV_TEST_OTP === 'true' &&
        normalizedPhone === (process.env.DEV_SANDBOX_TEST_NUMBER || '+251900000000');
    if (isDevSandbox) {
        db_js_1.db.createOtp(normalizedPhone);
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
    if (!sms_service_js_1.SmsService.isConfigured()) {
        res.status(503).json({
            success: false,
            error: 'SMS verification gateway is currently not configured on this server. Please use password login or contact the administrator to configure live SMS credentials in server/.env.',
            carrier: validation.carrierName,
            configured: false,
        });
        return;
    }
    // Create real random 6-digit OTP and send via configured SMS gateway
    const code = db_js_1.db.createOtp(normalizedPhone);
    const smsResult = await sms_service_js_1.SmsService.sendOtpSms(normalizedPhone, code);
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
exports.authRouter.post('/verify-otp', (req, res) => {
    const { phone, code } = req.body;
    if (!phone || !code) {
        res.status(400).json({ error: 'Phone number and 6-digit OTP code are required.' });
        return;
    }
    const cleanCode = code.toString().trim();
    const verifyResult = db_js_1.db.verifyOtp(phone, cleanCode);
    if (!verifyResult.success) {
        res.status(400).json({ error: verifyResult.error || 'Invalid or expired 6-digit verification code.' });
        return;
    }
    const existingUser = db_js_1.db.getUserByPhoneOrUsername(phone);
    if (existingUser) {
        const { passwordHash, ...safeUser } = existingUser;
        const token = (0, auth_js_1.generateToken)(safeUser);
        res.json({ success: true, user: safeUser, token, isNewUser: false });
    }
    else {
        // Automatically create a user profile for verified phone number if first time
        const cleanUsername = `user_${phone.replace(/\+/g, '')}`;
        const passwordHash = bcryptjs_1.default.hashSync('defaultPass123', 8);
        const newUser = {
            id: `user-${(0, uuid_1.v4)().slice(0, 8)}`,
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
        const safeUser = db_js_1.db.createUser(newUser);
        const token = (0, auth_js_1.generateToken)(safeUser);
        res.json({ success: true, user: safeUser, token, isNewUser: true });
    }
});
// Firebase Authentication Phone Login Endpoint
exports.authRouter.post('/firebase-login', async (req, res) => {
    const { idToken, phone, displayName } = req.body;
    if (!idToken) {
        res.status(400).json({ error: 'Firebase ID token is required for authentication.' });
        return;
    }
    // Cryptographically verify Firebase ID token
    const verifyResult = await firebase_auth_service_js_1.FirebaseAuthService.verifyIdToken(idToken);
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
    let user = (firebaseUid ? db_js_1.db.getUserById(firebaseUid) : undefined) || db_js_1.db.getUserByPhoneOrUsername(verifiedPhone);
    let isNewUser = false;
    if (!user) {
        isNewUser = true;
        const cleanUsername = `user_${verifiedPhone.replace(/\+/g, '')}`;
        const passwordHash = bcryptjs_1.default.hashSync((0, uuid_1.v4)(), 8);
        const newUser = {
            id: firebaseUid || `user-${(0, uuid_1.v4)().slice(0, 8)}`,
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
        db_js_1.db.createUser(newUser);
    }
    else {
        // Ensure ID is Firebase UID if present
        if (firebaseUid && user.id !== firebaseUid) {
            user.id = firebaseUid;
        }
        user.status = 'online';
        user.lastSeen = new Date().toISOString();
    }
    const { passwordHash, ...safeUser } = user;
    const token = (0, auth_js_1.generateToken)(safeUser);
    res.json({
        success: true,
        user: safeUser,
        token,
        isNewUser,
    });
});
// Register new user
exports.authRouter.post('/register', (req, res) => {
    const { phone, username, displayName, password, bio, avatarUrl, language } = req.body;
    if (!phone || !displayName || !password) {
        res.status(400).json({ error: 'Please fill all required fields.' });
        return;
    }
    const cleanUsername = (username || displayName.toLowerCase().replace(/\s+/g, '_')).replace('@', '');
    // Check uniqueness
    if (db_js_1.db.getUserByPhoneOrUsername(phone)) {
        res.status(400).json({ error: 'This phone number is already registered. Please log in instead.' });
        return;
    }
    if (db_js_1.db.getUserByPhoneOrUsername(cleanUsername)) {
        res.status(400).json({ error: 'This username is already taken. Please choose another username.' });
        return;
    }
    const passwordHash = bcryptjs_1.default.hashSync(password, 8);
    const newUser = {
        id: `user-${(0, uuid_1.v4)().slice(0, 8)}`,
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
    const safeUser = db_js_1.db.createUser(newUser);
    const token = (0, auth_js_1.generateToken)(safeUser);
    res.status(201).json({
        success: true,
        user: safeUser,
        token,
    });
});
// Login with password
exports.authRouter.post('/login', (req, res) => {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
        res.status(400).json({ error: 'Identifier and password are required.' });
        return;
    }
    const user = db_js_1.db.getUserByPhoneOrUsername(identifier);
    if (!user) {
        res.status(401).json({ error: 'User account not found.' });
        return;
    }
    const valid = bcryptjs_1.default.compareSync(password, user.passwordHash);
    if (!valid) {
        res.status(401).json({ error: 'Incorrect password entered.' });
        return;
    }
    user.status = 'online';
    user.lastSeen = new Date().toISOString();
    const { passwordHash, ...safeUser } = user;
    const token = (0, auth_js_1.generateToken)(safeUser);
    res.json({
        success: true,
        user: safeUser,
        token,
    });
});
// Current authenticated user
exports.authRouter.get('/me', auth_js_1.authenticate, (req, res) => {
    res.json({ user: req.user });
});
