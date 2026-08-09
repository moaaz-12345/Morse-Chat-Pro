# Morse Chat Pro production deployment

This guide prepares the Express + Socket.IO backend, MongoDB Atlas database, and Electron Windows installer for production.

## 1. MongoDB Atlas

1. Create a MongoDB Atlas project.
2. Create a cluster.
3. Create a database user with read/write access.
4. In Network Access, allow the backend host IP. For platforms with dynamic outbound IPs, use `0.0.0.0/0` only if you understand the risk.
5. Copy the connection string:

```text
mongodb+srv://<username>:<password>@<cluster>.mongodb.net/morse_chat_pro?retryWrites=true&w=majority
```

Use it as `MONGO_URI`.

## 2. Backend production environment

Create production env vars on the hosting provider:

```env
NODE_ENV=production
PORT=3000
CLIENT_ORIGIN=https://your-frontend-or-landing-domain.example.com
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/morse_chat_pro?retryWrites=true&w=majority
JWT_SECRET=<at-least-32-characters>
JWT_EXPIRES_IN=7d
GOOGLE_CLIENT_ID=<google-client-id>
GOOGLE_CLIENT_SECRET=<google-client-secret>
GOOGLE_CALLBACK_URL=https://your-backend-domain.example.com/auth/google/callback
```

Generate a secure JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## 3. Google OAuth

In Google Cloud Console, add this authorized redirect URI:

```text
https://your-backend-domain.example.com/auth/google/callback
```

For local development keep:

```text
http://localhost:3000/auth/google/callback
```

## 4. Deploy the backend

Recommended simple options:

- Render Web Service
- Railway Web Service
- VPS with Node.js + PM2 + Nginx
- Docker host

### Render

1. Push the repository to GitHub.
2. Create a new Render Web Service from `MorseServer`.
3. Build command:

```bash
npm ci
```

4. Start command:

```bash
npm start
```

5. Add the production env vars above.
6. Verify:

```text
https://your-backend-domain.example.com/health
```

It should return `{ "ok": true }`.

### Docker

From the repository root:

```bash
docker build -t morse-chat-pro-api ./MorseServer
docker run -p 3000:3000 --env-file ./MorseServer/.env.production morse-chat-pro-api
```

## 5. Frontend/Electron production config

The frontend reads `MorseApp/JS/app-config.js`.

For development:

```bash
cd MorseApp
npm run configure:dev
```

For production, point Electron to the deployed backend:

```powershell
cd MorseApp
$env:MORSE_SERVER_URL="https://your-backend-domain.example.com"
npm run configure:prod
```

## 6. Build the Windows installer

After setting `MORSE_SERVER_URL`:

```powershell
cd MorseApp
$env:MORSE_SERVER_URL="https://your-backend-domain.example.com"
npm run build:win:prod
```

Output:

```text
MorseApp/dist/Morse-Chat-Pro-Setup-1.0.0.exe
```

## 7. Verification checklist

Before distributing the installer:

- `/health` responds on the production backend.
- MongoDB Atlas shows active connections.
- Google OAuth redirects back to the production backend callback.
- Register works.
- Login works.
- Google login works.
- Socket.IO connects from Electron.
- Private chat works.
- Rooms work.
- Uploads work.
- Voice messages work.
- Voice/video calls and screen sharing connect.
- Notifications, mute, block, reactions, search, settings, and profile work.

## 8. Important production notes

- Do not commit `.env` files.
- Rotate the Google client secret if it was ever exposed.
- Uploads stored on local disk may disappear on ephemeral hosts. For durable production uploads, move files to S3, Cloudinary, or another object storage provider.
- Use HTTPS for the backend. Camera/microphone and WebRTC features are more reliable in secure contexts.
- If using a custom frontend domain, include it in `CLIENT_ORIGIN`.
