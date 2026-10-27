# ⚡ Meta Chat — Modern Telegram-Inspired Messaging Platform

> **A fast, responsive, Telegram-inspired messaging application supporting English, Afaan Oromoo, and አማርኛ (Amharic) with real carrier phone authentication, Progressive Web App (PWA) installation, channels, group chats, voice notes, and real-time WebSockets.**

---

## 🌟 What's New & Upgraded

1. **Carrier Phone Authentication & Truthful OTP Delivery**:
   - Supports **Ethiopia (+251)** with automated carrier network detection:
     - 🇪🇹 **Ethio Telecom**: numbers starting with `9...` (e.g. `91 123 4567`)
     - 🟢 **Safaricom Ethiopia**: numbers starting with `7...` (e.g. `71 234 5678`)
   - Supports **Saudi Arabia (+966)**, **Qatar (+974)**, **UAE / Dubai (+971)**, **Lebanon / Beirut (+961)**, **Canada (+1)**, and **Jordan (+962)** with country-specific dialing codes and validation.
   - **Send OTP** button, 6-digit verification code input, **Verify OTP** button, and an automated 60-second **Resend Countdown Timer**.
   - Truthful carrier delivery status: Never displays fake OTP codes on screen or falsely claims SMS delivery. If live carrier credentials are not yet added in `server/.env`, it clearly informs the developer while allowing test code `123456`.
   - After verification, automatically provisions account and enters Meta Chat.

2. **New Modern Vector Logo for Meta Chat**:
   - Clean, electric blue squircle base with continuous geometric "M" messaging cloud and aerodynamic flight tail.
   - Vector SVG asset deployed across [meta-logo.svg](file:///c:/Users/chal/Desktop/phone%20call/client/public/meta-logo.svg), [favicon.svg](file:///c:/Users/chal/Desktop/phone%20call/client/public/favicon.svg), [MetaLogo.tsx](file:///c:/Users/chal/Desktop/phone%20call/client/src/components/MetaLogo.tsx), installation screens, and navigation headers.

3. **Three Languages with Instant Switching**:
   - **English** (`en`)
   - **Afaan Oromoo** (`om`)
   - **አማርኛ / Amharic** (`am`)
   - Full translations for all authentication screens, phone fields, OTP statuses, chat lists, message menus, settings, and notifications.
   - Instant switching with local storage persistence across sessions.

4. **Progressive Web App (PWA) Mobile Installation**:
   - One-click **Install App** button on header, login screen, and hamburger drawer.
   - Guided installation workflows for Android, iOS Safari (*Add to Home Screen*), and Desktop browsers.
   - [manifest.json](file:///c:/Users/chal/Desktop/phone%20call/client/public/manifest.json) and [sw.js](file:///c:/Users/chal/Desktop/phone%20call/client/public/sw.js) for offline caching and standalone display.

---

## 🚀 Running the Application

Both services run concurrently:
```bash
node start-all.js
```
Or with npm:
```bash
npm.cmd run dev
```

- **Frontend Application**: [http://localhost:5173](http://localhost:5173)
- **Backend API Server**: [http://localhost:5000](http://localhost:5000)
- **WebSocket Gateway**: `ws://localhost:5000/ws`

---

## ⚙️ Live Carrier SMS Setup (Twilio / Firebase)

To deliver real SMS messages to mobile subscribers in Ethiopia (Ethio Telecom, Safaricom), Saudi Arabia, UAE, Qatar, Canada, etc., configure the following in [server/.env](file:///c:/Users/chal/Desktop/phone%20call/server/.env):

```env
# Twilio SMS Gateway Configuration
TWILIO_ACCOUNT_SID=ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
```

*Note: In development mode when these credentials are empty, the app informs you truthfully and enables test code `123456`.*
