# Morse Chat Pro

Morse Chat Pro is a real-time messaging application built with HTML, CSS, JavaScript, Node.js, Express, Socket.IO, MongoDB, Multer, JWT authentication, and Electron.

## v1.0.0 highlights

- Private messaging and rooms
- Morse encode/decode
- Message history, search, reply, edit, delete, copy, pin, and reactions
- Image, voice, video, and document uploads
- Drag & drop and multi-file upload
- User profiles with avatar, status, and bio
- Online users, last seen, typing indicator, notifications, and unread counters
- Theme system and responsive UI
- WebRTC voice, video, and screen sharing signaling
- Call history, busy state, call controls, and incoming call popup
- MongoDB storage
- JWT + bcrypt authentication
- Helmet, rate limiting, validation, upload hardening, and permission checks
- Electron Windows build configuration

## Project structure

```text
MorseApp/       Frontend and Electron shell
MorseServer/    Backend API, Socket.IO, MongoDB models, uploads
```

## Requirements

- Node.js 20+
- MongoDB 7+
- Windows 10/11 for the packaged Electron release

## Backend setup

```bash
cd MorseServer
npm install
copy ..\.env.example .env
npm start
```

Update `.env` before production:

```env
PORT=3000
CLIENT_ORIGIN=http://localhost:8080
MONGO_URI=mongodb://127.0.0.1:27017/morse_chat_pro
JWT_SECRET=replace-with-a-long-random-production-secret
JWT_EXPIRES_IN=7d
```

`JWT_SECRET` is required for authentication and must be at least 32 characters.

## Frontend / Electron setup

```bash
cd MorseApp
npm install
npm start
```

## Build Windows installer

```bash
cd MorseApp
npm run build
```

The Windows installer is generated in:

```text
MorseApp/dist/
```

## Verification checklist

- Login
- Register
- Chat
- Rooms
- File upload
- Voice messages
- Voice calls
- Video calls
- Screen sharing
- Search
- Settings
- Profile
- Reactions
- Theme
- Notifications

## Release artifact

The Windows v1.0.0 installer is generated at:

```text
MorseApp/dist/Morse-Chat-Pro-Setup-1.0.0.exe
```

## Notes

- Restart the backend after server-side changes.
- Use `Ctrl + F5` if the browser caches old CSS or assets.
- WebRTC camera, microphone, and screen sharing require manual browser permission testing.
- Do not commit `.env`, runtime uploads, or build artifacts.

## License

MIT
