Free Live Talk — starter website

What works:
- Mobile-friendly interface
- Room ID and shareable URL generation
- Browser permission prompt and local camera/microphone preview on HTTPS
- Local mic/camera toggles and leave-call cleanup
- Local-only chat UI

What is NOT yet implemented:
- Cross-device real-time video/audio calls
- Cross-device room chat
- Authentication, moderation backend, TURN/signaling service

A real multi-user app needs a signaling service and WebRTC connection handling (or a managed video SDK), plus a backend for room membership and chat. Do not present this starter as a fully functioning public calling service until that is connected and tested.

Free static hosting:
Cloudflare Pages supports static HTML and provides a pages.dev URL. Upload the folder containing index.html or connect a Git repository. Static hosting alone does not make cross-device calls/chat work.
