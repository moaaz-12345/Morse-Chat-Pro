# Contributing to Morse Chat Pro

Thank you for helping improve Morse Chat Pro.

## Development rules

- Do not rewrite the architecture from scratch.
- Keep the modular frontend JavaScript and CSS structure.
- Do not rename existing Socket.IO events unless a migration is documented.
- Keep MongoDB as the primary production storage.
- Keep UI changes consistent with the current purple/blue glassmorphism design.
- Add backend and frontend changes together when a feature requires both.

## Local workflow

1. Install dependencies:

   ```bash
   cd MorseServer
   npm install

   cd ../MorseApp
   npm install
   ```

2. Create backend environment:

   ```bash
   copy ..\.env.example ..\MorseServer\.env
   ```

3. Start MongoDB and the backend:

   ```bash
   cd MorseServer
   npm start
   ```

4. Start Electron:

   ```bash
   cd MorseApp
   npm start
   ```

## Checks before submitting changes

Run syntax checks:

```bash
cd MorseServer
npm run check

cd ../MorseApp
npm run check
```

Manual QA checklist:

- Login/Register
- Private chat
- Rooms
- Uploads
- Voice messages
- Calls
- Profile
- Settings
- Theme
- Notifications

## Security

- Never commit `.env`.
- Never commit production secrets.
- Keep upload validation strict.
- Do not trust client-supplied usernames when JWT auth is available.

