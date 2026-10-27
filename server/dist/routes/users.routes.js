"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usersRouter = void 0;
const express_1 = require("express");
const db_js_1 = require("../db.js");
const auth_js_1 = require("../auth.js");
const websocket_js_1 = require("../websocket.js");
exports.usersRouter = (0, express_1.Router)();
// Search users
exports.usersRouter.get('/search', auth_js_1.authenticate, (req, res) => {
    const query = req.query.q || '';
    const currentUserId = req.user.id;
    const users = db_js_1.db.searchUsers(query, currentUserId);
    res.json({ users });
});
// Get user profile by id
exports.usersRouter.get('/:id', auth_js_1.authenticate, (req, res) => {
    const user = db_js_1.db.getUserById(req.params.id);
    if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
    }
    const { passwordHash, ...safeUser } = user;
    res.json({ user: safeUser });
});
// Update profile
exports.usersRouter.put('/profile', auth_js_1.authenticate, (req, res) => {
    const currentUserId = req.user.id;
    const { displayName, bio, avatarUrl, language, theme, notificationsEnabled, privacyLastSeen } = req.body;
    const updated = db_js_1.db.updateUser(currentUserId, {
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
        (0, websocket_js_1.broadcastPresence)(currentUserId, updated.status, updated.lastSeen);
    }
    res.json({ success: true, user: updated });
});
