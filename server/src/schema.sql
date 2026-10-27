-- OromoChat PostgreSQL / SQLite Scalable Database Schema
-- Ready for production deployment with migrations

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    phone VARCHAR(32) UNIQUE NOT NULL,
    username VARCHAR(64) UNIQUE NOT NULL,
    display_name VARCHAR(128) NOT NULL,
    bio TEXT,
    avatar_url TEXT,
    password_hash VARCHAR(255) NOT NULL,
    status VARCHAR(16) DEFAULT 'offline',
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    language VARCHAR(8) DEFAULT 'om', -- 'om' or 'en'
    theme VARCHAR(32) DEFAULT 'telegram-dark',
    notifications_enabled BOOLEAN DEFAULT TRUE,
    privacy_last_seen VARCHAR(16) DEFAULT 'everybody',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Chats Table (Direct, Groups, Channels)
CREATE TABLE IF NOT EXISTS chats (
    id VARCHAR(64) PRIMARY KEY,
    type VARCHAR(16) NOT NULL, -- 'direct', 'group', 'channel'
    title VARCHAR(128) NOT NULL,
    avatar_url TEXT,
    username VARCHAR(64) UNIQUE, -- for public channels and groups e.g. @oromo_tech
    description TEXT,
    creator_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    is_pinned BOOLEAN DEFAULT FALSE,
    is_muted BOOLEAN DEFAULT FALSE,
    member_count INT DEFAULT 1,
    subscriber_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Chat Participants (Membership and Roles)
CREATE TABLE IF NOT EXISTS chat_participants (
    id VARCHAR(64) PRIMARY KEY,
    chat_id VARCHAR(64) NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(16) DEFAULT 'member', -- 'creator', 'admin', 'member'
    unread_count INT DEFAULT 0,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(chat_id, user_id)
);

-- 4. Messages Table
CREATE TABLE IF NOT EXISTS messages (
    id VARCHAR(64) PRIMARY KEY,
    chat_id VARCHAR(64) NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    sender_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(16) DEFAULT 'text', -- 'text', 'image', 'voice', 'file', 'system'
    content TEXT NOT NULL,
    media_url TEXT,
    media_duration INT, -- audio note seconds
    file_name VARCHAR(255),
    file_size VARCHAR(32),
    reply_to_id VARCHAR(64) REFERENCES messages(id) ON DELETE SET NULL,
    status VARCHAR(16) DEFAULT 'sent', -- 'sending', 'sent', 'delivered', 'read'
    is_pinned BOOLEAN DEFAULT FALSE,
    views INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Message Reactions
CREATE TABLE IF NOT EXISTS message_reactions (
    id VARCHAR(64) PRIMARY KEY,
    message_id VARCHAR(64) NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    emoji VARCHAR(16) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(message_id, user_id, emoji)
);

-- Indexes for high-speed queries
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user_id ON chat_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
