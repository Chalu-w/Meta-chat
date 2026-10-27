"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatsRouter = void 0;
const express_1 = require("express");
const uuid_1 = require("uuid");
const db_js_1 = require("../db.js");
const auth_js_1 = require("../auth.js");
const websocket_js_1 = require("../websocket.js");
exports.chatsRouter = (0, express_1.Router)();
// List user's chats
exports.chatsRouter.get('/', auth_js_1.authenticate, (req, res) => {
    const userId = req.user.id;
    const filter = req.query.filter; // 'all' | 'direct' | 'group' | 'channel'
    const search = (req.query.q || '').toLowerCase().trim();
    let chats = db_js_1.db.getUserChats(userId);
    if (filter && filter !== 'all') {
        chats = chats.filter((c) => c.type === filter);
    }
    if (search) {
        chats = chats.filter((c) => c.title.toLowerCase().includes(search) ||
            (c.username && c.username.toLowerCase().includes(search)) ||
            (c.description && c.description.toLowerCase().includes(search)));
    }
    res.json({ chats });
});
// Create chat (Direct, Group, or Channel)
exports.chatsRouter.post('/', auth_js_1.authenticate, (req, res) => {
    const currentUserId = req.user.id;
    const { type, title, username, description, participantIds = [], avatarUrl } = req.body;
    if (!type || !['direct', 'group', 'channel'].includes(type)) {
        res.status(400).json({ error: 'Gosa haasaa sirrii filadhaa (Invalid chat type)' });
        return;
    }
    // If direct chat, verify if an existing 1-on-1 chat already exists
    if (type === 'direct') {
        const targetUserId = participantIds[0];
        if (!targetUserId) {
            res.status(400).json({ error: 'Fayyadamamaa barbaadame filadhaa (Target user required)' });
            return;
        }
        const existingChats = db_js_1.db.getUserChats(currentUserId);
        const existing = existingChats.find((c) => c.type === 'direct' &&
            c.participantIds.includes(currentUserId) &&
            c.participantIds.includes(targetUserId));
        if (existing) {
            res.json({ chat: existing, isExisting: true });
            return;
        }
        const targetUser = db_js_1.db.getUserById(targetUserId);
        if (!targetUser) {
            res.status(404).json({ error: 'Fayyadamamaa hin argamne (User not found)' });
            return;
        }
        const newChat = {
            id: `chat-${(0, uuid_1.v4)().slice(0, 8)}`,
            type: 'direct',
            title: targetUser.displayName,
            avatarUrl: targetUser.avatarUrl,
            participantIds: [currentUserId, targetUserId],
            adminIds: [currentUserId, targetUserId],
            creatorId: currentUserId,
            unreadCount: 0,
            isPinned: false,
            isMuted: false,
            updatedAt: new Date().toISOString(),
        };
        db_js_1.db.createChat(newChat);
        res.status(201).json({ chat: newChat });
        return;
    }
    // Group or Channel
    if (!title) {
        res.status(400).json({ error: 'Mata duree galchaa (Title is required)' });
        return;
    }
    const allParticipants = Array.from(new Set([currentUserId, ...participantIds]));
    const newChat = {
        id: `chat-${(0, uuid_1.v4)().slice(0, 8)}`,
        type,
        title,
        username: username ? username.replace('@', '') : undefined,
        description,
        avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${title}`,
        participantIds: type === 'channel' ? [currentUserId] : allParticipants,
        adminIds: [currentUserId],
        creatorId: currentUserId,
        unreadCount: 0,
        isPinned: false,
        isMuted: false,
        memberCount: type === 'group' ? allParticipants.length : undefined,
        subscriberCount: type === 'channel' ? 1 : undefined,
        updatedAt: new Date().toISOString(),
    };
    db_js_1.db.createChat(newChat);
    res.status(201).json({ chat: newChat });
});
// Get specific chat details
exports.chatsRouter.get('/:id', auth_js_1.authenticate, (req, res) => {
    const chat = db_js_1.db.getChatById(req.params.id);
    if (!chat) {
        res.status(404).json({ error: 'Haasaan hin argamne (Chat not found)' });
        return;
    }
    res.json({ chat });
});
// Get messages for a chat
exports.chatsRouter.get('/:id/messages', auth_js_1.authenticate, (req, res) => {
    const chatId = req.params.id;
    const chat = db_js_1.db.getChatById(chatId);
    if (!chat) {
        res.status(404).json({ error: 'Chat not found' });
        return;
    }
    const messages = db_js_1.db.getMessages(chatId);
    res.json({ messages });
});
// Send message to chat
exports.chatsRouter.post('/:id/messages', auth_js_1.authenticate, (req, res) => {
    const chatId = req.params.id;
    const user = req.user;
    const chat = db_js_1.db.getChatById(chatId);
    if (!chat) {
        res.status(404).json({ error: 'Chat not found' });
        return;
    }
    // If channel, only admins can broadcast
    if (chat.type === 'channel' && !chat.adminIds.includes(user.id)) {
        res.status(403).json({ error: 'Chaanaalii irratti bulchaan qofti ergaa dabarsuu dandaʼa (Only admins can post in channels)' });
        return;
    }
    const { type = 'text', content = '', mediaUrl, mediaDuration, fileName, fileSize, replyToId, } = req.body;
    if (!content.trim() && !mediaUrl) {
        res.status(400).json({ error: 'Qabiyyeen ergaa duwwaa taʼuu hin dandaʼu (Message content required)' });
        return;
    }
    let replyToMessage;
    if (replyToId) {
        const orig = db_js_1.db.getMessages(chatId).find((m) => m.id === replyToId);
        if (orig) {
            replyToMessage = {
                id: orig.id,
                senderName: orig.senderName,
                content: orig.content.slice(0, 100),
            };
        }
    }
    const newMsg = {
        id: `msg-${(0, uuid_1.v4)().slice(0, 8)}`,
        chatId,
        senderId: user.id,
        senderName: user.displayName,
        senderAvatar: user.avatarUrl,
        senderUsername: user.username,
        type,
        content,
        mediaUrl,
        mediaDuration,
        fileName,
        fileSize,
        replyToId,
        replyToMessage,
        status: 'delivered',
        reactions: {},
        views: chat.type === 'channel' ? 1 : undefined,
        createdAt: new Date().toISOString(),
    };
    db_js_1.db.addMessage(newMsg);
    // Broadcast message in real-time to participants via WebSocket
    (0, websocket_js_1.broadcastToChat)(chatId, {
        type: 'MESSAGE_NEW',
        payload: { message: newMsg },
    });
    res.status(201).json({ message: newMsg });
});
// React to message
exports.chatsRouter.post('/:id/reactions', auth_js_1.authenticate, (req, res) => {
    const chatId = req.params.id;
    const { messageId, emoji } = req.body;
    const userId = req.user.id;
    if (!messageId || !emoji) {
        res.status(400).json({ error: 'Message ID and emoji are required' });
        return;
    }
    const updatedMsg = db_js_1.db.toggleReaction(chatId, messageId, emoji, userId);
    if (!updatedMsg) {
        res.status(404).json({ error: 'Message not found' });
        return;
    }
    (0, websocket_js_1.broadcastToChat)(chatId, {
        type: 'MESSAGE_REACT',
        payload: { messageId, emoji, userId, reactions: updatedMsg.reactions },
    });
    res.json({ success: true, message: updatedMsg });
});
// Pin or unpin message
exports.chatsRouter.post('/:id/pin', auth_js_1.authenticate, (req, res) => {
    const chatId = req.params.id;
    const { messageId, isPinned } = req.body;
    const updated = db_js_1.db.updateMessage(chatId, messageId, { isPinned: !!isPinned });
    if (!updated) {
        res.status(404).json({ error: 'Message not found' });
        return;
    }
    (0, websocket_js_1.broadcastToChat)(chatId, {
        type: 'PIN_MESSAGE',
        payload: { chatId, messageId, isPinned },
    });
    res.json({ success: true, message: updated });
});
// Delete message
exports.chatsRouter.delete('/:id/messages/:messageId', auth_js_1.authenticate, (req, res) => {
    const { id: chatId, messageId } = req.params;
    const success = db_js_1.db.deleteMessage(chatId, messageId);
    if (!success) {
        res.status(404).json({ error: 'Message not found' });
        return;
    }
    (0, websocket_js_1.broadcastToChat)(chatId, {
        type: 'DELETE_MESSAGE',
        payload: { chatId, messageId },
    });
    res.json({ success: true });
});
