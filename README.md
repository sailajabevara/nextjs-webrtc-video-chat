# Next.js WebRTC Video Chat Application

## Project Overview
This project is a Real-Time Video Chat Application built using Next.js, WebRTC, and Socket.IO.

Users can join a room and communicate through video, audio, and chat in real time.

WebRTC is used to establish peer-to-peer video connections, while Socket.IO is used for signaling between clients.

---

## Features

### 1. Room Based Video Chat
Users can join a room using a URL:

/room/<roomId>

Example:

http://localhost:3000/room/test

Multiple users entering the same room can communicate.

---

### 2. Local Video Streaming
When a user joins the room, the browser asks permission to access:

- Camera
- Microphone

This is done using:

navigator.mediaDevices.getUserMedia()

The local video stream is displayed on the screen.

---

### 3. Remote Video Streaming
When another user joins the room:

1. A WebRTC PeerConnection is created
2. Offer and Answer are exchanged
3. ICE candidates establish connectivity

The remote user's video stream appears automatically.

---

### 4. WebRTC Signaling
WebRTC connection is established using Socket.IO signaling events.

Events used:

- join-room
- offer
- answer
- ice-candidate
- user-disconnected

These events allow browsers to exchange connection information.

---

### 5. Connection Status
The application shows connection state:

- Waiting for others
- Connecting
- Connected

This helps users understand the call progress.

---

### 6. Microphone Control
Users can mute or unmute their microphone.

Button:

Mute Mic / Unmute Mic

This toggles the audio track.

---

### 7. Camera Control
Users can turn their camera on or off.

Button:

Toggle Camera

This toggles the video track.

---

### 8. Hang Up Button
The Hang Up button:

- Closes peer connections
- Stops media streams
- Disconnects the socket
- Redirects to home page

---

### 9. Real-Time Chat
Users in the same room can send messages.

Messages are transmitted using:

socket.emit("chat-message")

Messages appear in the chat box.

---

### 10. User Disconnect Handling
If a user leaves the room:

- Peer connection closes
- Video element is removed
- Other users are notified

---

## Technologies Used

Frontend:
- Next.js
- React
- TypeScript

Real-Time Communication:
- WebRTC
- Socket.IO

Backend:
- Node.js HTTP server
- Socket.IO signaling

Deployment:
- Docker
- Docker Compose

---

## Running the Application with Docker

Step 1: Build and start the container

docker compose up --build

Step 2: Open the application

http://localhost:3000

Step 3: Join a room

http://localhost:3000/room/test

Open the same URL in another browser tab to start a video call.

---
## 📂 Project Structure

```
webrtc-video-chat
│
├── app
│   ├── room
│   │   └── [roomId]
│   │       └── page.tsx
│   │
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
│
├── server.ts
├── docker-compose.yml
├── Dockerfile
├── package.json
└── README.md
```

## Conclusion

This application demonstrates how to build a real-time video chat system using WebRTC and Socket.IO.

The project includes:

- Real-time video communication
- Audio and camera controls
- Chat messaging
- Docker container deployment