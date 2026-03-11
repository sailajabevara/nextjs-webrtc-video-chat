
"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { io } from "socket.io-client";

const socket = io();

export default function RoomPage() {
  const { roomId } = useParams();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteContainerRef = useRef<HTMLDivElement>(null);

  const localStream = useRef<MediaStream | null>(null);
  const peerConnections = useRef<Record<string, RTCPeerConnection>>({});

  const [status, setStatus] = useState("waiting");
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    async function start() {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      localStream.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      socket.emit("join-room", roomId);
    }

    start();

    socket.on("user-joined", async (userId) => {
      setStatus("connecting");

      const pc = createPeerConnection(userId);
      peerConnections.current[userId] = pc;

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit("offer", { offer, to: userId });
    });

    socket.on("offer", async ({ offer, from }) => {
      setStatus("connecting");

      const pc = createPeerConnection(from);
      peerConnections.current[from] = pc;

      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit("answer", { answer, to: from });
    });

    socket.on("answer", async ({ answer, from }) => {
      const pc = peerConnections.current[from];
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on("ice-candidate", async ({ candidate, from }) => {
      const pc = peerConnections.current[from];
      if (pc) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    socket.on("user-disconnected", (userId) => {
      const pc = peerConnections.current[userId];

      if (pc) {
        pc.close();
        delete peerConnections.current[userId];
      }

      const video = document.getElementById(userId);
      if (video) video.remove();

      setStatus("waiting");
    });

    socket.on("chat-message", ({ message }) => {
      setMessages((prev) => [...prev, message]);
    });
  }, []);

  function createPeerConnection(userId: string) {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    localStream.current?.getTracks().forEach((track) => {
      pc.addTrack(track, localStream.current!);
    });

    pc.ontrack = (event) => {
      setStatus("connected");

      if (document.getElementById(userId)) return;

      const video = document.createElement("video");

      video.id = userId;
      video.srcObject = event.streams[0];
      video.autoplay = true;
      video.playsInline = true;

      video.style.width = "300px";
      video.style.borderRadius = "10px";
      video.style.border = "2px solid black";

      remoteContainerRef.current?.appendChild(video);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", {
          candidate: event.candidate,
          to: userId,
        });
      }
    };

    return pc;
  }

  function toggleMute() {
    if (!localStream.current) return;

    const audioTrack = localStream.current.getAudioTracks()[0];
    if (!audioTrack) return;

    audioTrack.enabled = !audioTrack.enabled;
    setIsMuted(!audioTrack.enabled);
  }

  function toggleCamera() {
    if (!localStream.current) return;

    const videoTrack = localStream.current.getVideoTracks()[0];
    if (!videoTrack) return;

    videoTrack.enabled = !videoTrack.enabled;
  }

  function hangUp() {
    Object.values(peerConnections.current).forEach((pc) => pc.close());

    peerConnections.current = {};

    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => track.stop());
    }

    socket.disconnect();
    window.location.href = "/";
  }

  function sendMessage() {
    if (!input.trim()) return;

    socket.emit("chat-message", {
      roomId,
      message: input,
    });

    setMessages((prev) => [...prev, input]);
    setInput("");
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#f3f4f6",
        fontFamily: "Arial",
      }}
    >
      <h2 style={{ marginBottom: "20px" }}>
        {status === "waiting" && "Waiting for others..."}
        {status === "connecting" && "Connecting..."}
        {status === "connected" && "Connected"}
      </h2>

      <div
        style={{
          display: "flex",
          gap: "20px",
          marginBottom: "20px",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <video
          ref={localVideoRef}
          autoPlay
          muted
          style={{
            width: "300px",
            borderRadius: "10px",
            border: "2px solid black",
          }}
        />

        <div ref={remoteContainerRef} style={{ display: "flex", gap: "20px" }} />
      </div>

      <div style={{ display: "flex", gap: "15px", marginBottom: "20px" }}>
        <button
          onClick={toggleMute}
          style={{
            padding: "10px 20px",
            background: "#ef4444",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          {isMuted ? "Unmute Mic" : "Mute Mic"}
        </button>

        <button
          onClick={toggleCamera}
          style={{
            padding: "10px 20px",
            background: "#3b82f6",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          Toggle Camera
        </button>

        <button
          onClick={hangUp}
          style={{
            padding: "10px 20px",
            background: "black",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          Hang Up
        </button>
      </div>

      <div
        style={{
          width: "420px",
          background: "white",
          borderRadius: "10px",
          padding: "10px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
        }}
      >
        <div
          style={{
            height: "150px",
            overflowY: "auto",
            border: "1px solid #ddd",
            padding: "8px",
            marginBottom: "10px",
          }}
        >
          {messages.map((msg, i) => (
            <div key={i}>{msg}</div>
          ))}
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type message..."
            style={{
              flex: 1,
              padding: "8px",
              border: "1px solid #ccc",
              borderRadius: "5px",
            }}
          />

          <button
            onClick={sendMessage}
            style={{
              padding: "8px 15px",
              background: "#10b981",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}