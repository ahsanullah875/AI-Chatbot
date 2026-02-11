# AI Chatbot - Secure API Key Setup

## Overview
Your API key is now securely stored in a `.env` file and managed through a backend proxy. The frontend never exposes sensitive credentials.

## Setup Instructions

### 1. Environment Variables
- **`.env`** - Contains your actual API key (never commit this)
- **`.env.example`** - Template file showing the structure (safe to commit)
- **`.gitignore`** - Prevents `.env` from being committed

### 2. Backend Proxy Setup

The `server.js` file acts as a middleware between your frontend and the OpenRouter API.

**Install dependencies:**
```bash
npm install
```

**Start the server:**
```bash
npm run dev
# or
npm start
```

The server will run on `http://localhost:3000`

### 3. How It Works

**Before (Insecure):**
```
Frontend (Browser) 
    ↓ (exposing API key)
    ↓
OpenRouter API
```

**After (Secure):**
```
Frontend (Browser)
    ↓ (no credentials)
    ↓
Backend Server (has API key)
    ↓ (with API key)
    ↓
OpenRouter API
```

### 4. Important Security Notes

✅ **What's Secure:**
- API key stored locally in `.env` (not in Git)
- Requests from frontend don't expose the key
- Backend handles all API authentication
- CORS configured for local development

⚠️ **Before Production:**
- Deploy backend to a secure server (Heroku, AWS, Vercel, etc.)
- Update `API_PROXY_URL` in `script.js` to your production backend URL
- Use environment variables on your hosting platform
- Add proper error handling and rate limiting
- Enable HTTPS only
- Add authentication if needed

### 5. Update Your .env File

Replace the placeholder in `.env` with your actual API key:
```
VITE_API_KEY=your_actual_api_key_here
```

### 6. Never Commit .env
The `.gitignore` file already prevents `.env` from being committed, but verify:
```bash
git status
# You should NOT see .env in the list
```

## Alternative: Using Vite (Build Tool Approach)

If you prefer using a build tool like Vite:

```bash
npm install -D vite
```

Update your scripts in `package.json`:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

Access env variables in `script.js`:
```javascript
const apiKey = import.meta.env.VITE_API_KEY;
```

Vite will inject the value at build time, keeping it secure in production.

## Troubleshooting

**Error: Cannot find module 'express'**
- Run: `npm install`

**Error: CORS error**
- Ensure server.js is running on `http://localhost:3000`

**Error: 404 on /api/chat**
- Backend proxy endpoint is missing - verify server.js is running

## Files Created/Modified

- ✅ `.env` - Your API key (local only)
- ✅ `.env.example` - Template for team
- ✅ `.gitignore` - Prevents accidental commits
- ✅ `server.js` - Backend proxy for API calls
- ✅ `package.json` - Backend dependencies
- ✅ `script.js` - Updated to use proxy (API key removed)
