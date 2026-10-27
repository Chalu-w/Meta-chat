"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mediaRouter = void 0;
const express_1 = require("express");
const auth_js_1 = require("../auth.js");
exports.mediaRouter = (0, express_1.Router)();
// Simulated / direct media upload endpoint (supports base64 audio/images or direct URLs)
exports.mediaRouter.post('/upload', auth_js_1.authenticate, (req, res) => {
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
