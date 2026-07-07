# Morse Chat Pro - Full Project Summary

Last updated: 2026-07-07

## Project paths

- Project root: `E:\materal\Morse Project`
- Backend: `E:\materal\Morse Project\MorseServer`
- Frontend: `E:\materal\Morse Project\MorseApp`

## Current stack

- Frontend: HTML, CSS, vanilla JavaScript
- Backend: Node.js, Express, Socket.IO
- Database: MongoDB
- Legacy fallback storage: `messages.json`
- Uploads: Multer
- Auth: JWT + bcrypt
- Realtime: Socket.IO

## Local runtime status

- Backend runs on: `http://localhost:3000`
- Frontend was being tested through: `localhost:8080/Html/chat.html`
- MongoDB local Docker container used earlier: `morse-chat-mongo`
- Mongo URI in backend `.env`: `mongodb://127.0.0.1:27017/morse_chat_pro`
- Important: after backend code changes, restart the Node server.

## Architecture

### Backend structure

- `server.js`
- `config/serverConfig.js`
- `config/database.js`
- `models/User.js`
- `models/Message.js`
- `models/Room.js`
- `models/Reaction.js`
- `models/Call.js`
- `routes/authRoutes.js`
- `routes/uploadRoutes.js`
- `middleware/authMiddleware.js`
- `middleware/socketAuth.js`
- `middleware/requireMongo.js`
- `middleware/securityMiddleware.js`
- `middleware/errorMiddleware.js`
- `socket/chatSocket.js`
- `storage/jsonMessageStore.js`
- `storage/mongoMessageStore.js`
- `utils/authToken.js`
- `utils/messageMapper.js`
- `utils/userValidation.js`
- `utils/messageValidation.js`
- `scripts/migrateMessagesToMongo.js`

### Frontend structure

- `Html/chat.html`
- `Html/login.html`
- `CSS/style.css`
- `CSS/modules/base.css`
- `CSS/modules/sidebar.css`
- `CSS/modules/chat-layout.css`
- `CSS/modules/messages.css`
- `CSS/modules/settings.css`
- `CSS/modules/calls.css`
- `CSS/modules/themes.css`
- `CSS/modules/responsive.css`
- `JS/chat-state.js`
- `JS/chat-render.js`
- `JS/chat-actions.js`
- `JS/chat-ui.js`
- `JS/chat-sockets.js`
- `JS/calls.js`
- `JS/chat.js`
- `JS/morse.js`
- `JS/converter.js`

## Completed major features

### Chat

- Private chat
- Rooms
- Online users
- Last seen
- Typing indicator
- Message history
- Search inside chat history
- Notifications
- Unread counters
- Sent / Delivered / Seen UI

### Messages

- Morse encode/decode
- Reusable `renderMessage()`
- Telegram-style message menu
- Reply
- Edit
- Delete
- Copy message
- Pin message
- Reactions: ❤️ 👍 😂 🔥
- User avatars beside messages
- Image messages
- Voice messages
- File messages
- Video preview
- Download links

### UI

- Modular CSS
- Modular JavaScript
- Official Morse Chat Pro logo integrated across Electron icon, favicon, login, sidebar brand mark, and splash screen
- Login page redesigned with local premium CSS after removing Bootstrap card styling that made the logo/page look oversized and inconsistent
- Theme toggle
- Settings panel
- Settings close button fixed
- Responsive UI
- Profile edit form inside settings
- Public profile popup from user list

### Auth and database

- MongoDB storage replacing JSON as primary store
- User, Message, Room, Reaction, Call models
- Register/Login with JWT and bcrypt
- `/auth/me`
- `/auth/profile`
- `/users/:username/profile`
- Socket.IO auth via JWT
- Upload endpoint protected by JWT when MongoDB is connected
- User avatars/status/bio stored in database

### Uploads

- Drag & drop upload
- Multi-file upload
- File preview before sending
- Upload progress
- Supported types:
  - Images
  - Audio
  - Video
  - PDF
  - DOC / DOCX
  - ZIP
  - XLS / XLSX
- Max file size: 50MB
- MIME + extension validation
- Unsafe upload paths rejected

### WebRTC / calls

- Call model stored in MongoDB
- Voice call signaling
- Video call signaling
- Screen share signaling
- One-way screen share behavior
- Incoming call popup
- Call timer/status UI
- Call history
- Busy state
- Mute/unmute
- Camera on/off
- Stop sharing
- Call ended UI

Important: actual browser WebRTC permissions for mic/camera/screen still need manual testing from the browser.

### Security

- Helmet security headers
- Content Security Policy
- Rate limiting
- Stronger auth rate limiting
- JWT auth on protected routes
- Socket.IO JWT auth
- Input validation and sanitization for messages
- Upload type hardening
- Auth/profile validation
- Message edit/delete permissions
- General 404 handler
- General error handler
- Invalid JSON handler

## Important Socket.IO event names preserved

Existing event names were kept. New events were only added where needed.

Existing/used events include:

- `join`
- `users-list`
- `private-message`
- `receive-message`
- `room-message`
- `receive-room-message`
- `join-room`
- `load-room-history`
- `room-history`
- `load-history`
- `chat-history`
- `typing`
- `user-typing`
- `message-delivered`
- `message-seen`
- `message-status`
- `edit-message`
- `message-edited`
- `delete-message`
- `message-deleted`
- `react-message`
- `message-reacted`
- `pin-message`
- `message-pinned`
- `call-offer`
- `incoming-call`
- `call-answer`
- `call-answered`
- `ice-candidate`
- `end-call`
- `call-ended`
- `load-call-history`
- `call-history`

New events added:

- `call-busy`
- `message-action-denied`

## Recent fixes from user feedback

- Settings panel close button initially looked bad because it inherited general settings button styling.
- Fixed by making top close control a `span role="button"` with `.settings-close`, plus a `Close Settings` fallback button.
- Call History button now calls `openCallHistory()`, closes settings first, and then opens call history.
- `window.callManager` is explicitly assigned so inline handlers can access it.

## Verification already done

Smoke tests completed successfully for:

- Socket without token rejected
- Socket with token accepted
- Spoofed join ignored; server trusts JWT user
- Online/lastSeen updates
- Protected upload without token returns 401
- Protected upload with token succeeds
- Reserved usernames rejected
- Mongo message migration completed earlier
- Screen share signaling stored as `screen`
- Call busy event works
- PDF upload succeeds
- Fake extension upload rejected
- Message sanitization rejects unsafe upload paths
- Non-owner edit/delete denied
- Profile update sanitizes avatar/bio/status
- Public profile endpoint works

Syntax checks were run repeatedly for changed backend/frontend JS files.

## Known notes / caveats

- Frontend still uses inline handlers in HTML. This is okay for now, but future cleanup can move to event listeners.
- CSP currently allows `'unsafe-inline'` styles because the frontend uses inline style patterns and legacy HTML.
- Some HTML uses CDN Socket.IO script.
- WebRTC should be tested manually with two browser sessions and real camera/mic/screen permissions.
- If the browser shows stale UI/CSS, use hard refresh: `Ctrl + F5`.
- If backend changes do not appear, restart Node server.

## Suggested remaining roadmap

### Immediate next steps

1. Manual browser QA:
   - Login/register
   - Settings close
   - Profile edit
   - User profile popup
   - File uploads
   - Call history
   - Voice/video/screen calls

2. Improve user profiles:
   - Dedicated profile page
   - Better avatar upload instead of URL only
   - Online indicator in profile popup
   - Status presets

3. Finish call UX:
   - Better device permission errors
   - Incoming ringtone
   - Missed call notification
   - Reconnect/failure states
   - Manual full WebRTC test

### Phase 5 remaining

- Archived chats
- Starred messages
- Forward messages
- Export chat
- Better typing improvements
- User profile page

### Phase 6 remaining

- PWA manifest
- Service worker
- Offline support
- Desktop notifications
- Installable app
- Electron desktop improvements

### Further security hardening

- Consider moving JWT to httpOnly cookies later
- Add CSRF only if cookie-based auth is introduced
- Add structured logging
- Add request ID middleware
- Add automated tests
- Add stricter CSP after removing inline handlers
- Add virus scanning for uploads if production-facing

## How to continue safely

- Do not rewrite the project from scratch.
- Preserve modular JS/CSS architecture.
- Preserve existing Socket.IO event names.
- Keep MongoDB as primary storage.
- Keep JSON storage fallback unless intentionally removed.
- For any backend feature, update frontend consistently.
- Restart backend after server-side changes.
- Run `node --check` on changed JS files.
- Prefer small incremental changes with smoke tests.
