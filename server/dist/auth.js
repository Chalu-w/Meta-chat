"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateToken = generateToken;
exports.verifyToken = verifyToken;
exports.authenticate = authenticate;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_js_1 = require("./db.js");
const JWT_SECRET = process.env.JWT_SECRET || 'oromochat-super-secure-jwt-secret-key-2026';
function generateToken(user) {
    return jsonwebtoken_1.default.sign({
        id: user.id,
        phone: user.phone,
        username: user.username,
        displayName: user.displayName,
    }, JWT_SECRET, { expiresIn: '30d' });
}
function verifyToken(token) {
    try {
        return jsonwebtoken_1.default.verify(token, JWT_SECRET);
    }
    catch (err) {
        return null;
    }
}
function authenticate(req, res, next) {
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
    const user = db_js_1.db.getUserById(decoded.id);
    if (!user) {
        res.status(401).json({ error: 'User no longer exists' });
        return;
    }
    const { passwordHash, ...safeUser } = user;
    req.user = safeUser;
    next();
}
