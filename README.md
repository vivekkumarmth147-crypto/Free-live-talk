# Free Live Talking

A mobile-friendly starter website for random one-to-one video/voice chat. It uses WebRTC for media and Socket.IO for signaling and random pairing.

## Run locally

1. Install Node.js 18 or newer.
2. In this folder run:
   ```bash
   npm install
   npm start
   ```
3. Open `http://localhost:3000` on the same device. Allow camera and microphone.

## Make it available online

Deploy the project to a Node.js host that supports persistent WebSocket connections (for example, a suitable Render, Railway, or VPS service). Set the start command to `npm start`. Use the host's HTTPS URL; camera/microphone access generally requires HTTPS outside localhost.

## Important limitations before public launch

- This is a starter implementation, not a fully moderated production service.
- The included Google STUN server helps peers discover network paths but is not a TURN relay. Some mobile/carrier/firewalled networks will fail to connect. Add a TURN service for reliability.
- Random matching is held in the memory of one server process. Use a single instance or implement shared coordination before scaling.
- Add age restrictions, reporting/blocking, rate limits, abuse prevention, privacy policy, terms, and a moderation process before opening to the public.
- Don't promise complete anonymity or record calls without clear consent.
- HTTPS is required for camera/microphone access on deployed sites.
- Keep dependencies updated and configure host security settings.

## How matching works

The first visitor waits in a queue. When a second visitor presses Start, the server pairs them and relays WebRTC offer/answer/ICE signaling. Video and audio travel peer-to-peer when network conditions permit; the server does not receive the media stream.
