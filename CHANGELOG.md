# Changelog

All notable changes to Morse Chat Pro are documented in this file.

## [1.0.0] - 2026-07-07

### Added

- Private chat and room chat
- Morse encode/decode workflow
- Message history, search, reply, edit, delete, copy, pin, and reactions
- Telegram-style message action menu
- User avatars beside message bubbles
- Image uploads, voice messages, video/file uploads, drag & drop, multi-file upload, and upload progress
- JWT + bcrypt authentication with secure register/login
- MongoDB storage with User, Message, Room, Reaction, and Call models
- Profile editing with avatar upload, status, and bio
- Public profile popup from the user list
- Online users, last seen, typing indicator, notifications, and unread counters
- Theme system, settings panel, and responsive UI
- WebRTC signaling for voice calls, video calls, and screen sharing
- Incoming call popup, call timer/status UI, call history, busy state, and call controls
- Premium splash screen and official logo integration
- Electron Windows build configuration

### Security

- Helmet security headers
- Rate limiting for general and auth routes
- JWT-authenticated Socket.IO connections
- Protected uploads
- Message payload validation and sanitization
- Upload MIME + extension validation
- Profile/auth validation
- Edit/delete permission checks
- Centralized 404 and error handling

### Fixed

- Settings panel close behavior and styling
- Call History visibility from Settings
- Base64 avatar handling replaced with safer uploaded avatar flow
- Login page styling after Bootstrap card conflicts
- Logo sizing and app icon consistency

