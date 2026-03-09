
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
        audio: true
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

      socket.emit("offer", {
        offer,
        to: userId
      });

    });

    socket.on("offer", async ({ offer, from }) => {

      setStatus("connecting");

      const pc = createPeerConnection(from);
      peerConnections.current[from] = pc;

      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit("answer", {
        answer,
        to: from
      });

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

      if (video) {
        video.remove();
      }

      setStatus("waiting");

    });

    socket.on("chat-message", ({ message }) => {
      setMessages((prev) => [...prev, message]);
    });

  }, []);

  function createPeerConnection(userId: string) {

    const pc = new RTCPeerConnection({
      iceServers: [
        {
          urls: "stun:stun.l.google.com:19302"
        }
      ]
    });

    localStream.current?.getTracks().forEach(track => {
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
      video.className = "w-64 border";

      remoteContainerRef.current?.appendChild(video);

    };

    pc.onicecandidate = (event) => {

      if (event.candidate) {

        socket.emit("ice-candidate", {
          candidate: event.candidate,
          to: userId
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

    Object.values(peerConnections.current).forEach((pc) => {
      pc.close();
    });

    peerConnections.current = {};

    if (localStream.current) {
      localStream.current.getTracks().forEach(track => track.stop());
    }

    socket.disconnect();

    window.location.href = "/";

  }

  function sendMessage() {

    if (!input.trim()) return;

    socket.emit("chat-message", {
      roomId,
      message: input
    });

    setMessages((prev) => [...prev, input]);

    setInput("");

  }

  return (
    <div className="p-6">

      {status === "waiting" && (
        <h2 data-test-id="status-waiting">Waiting for others...</h2>
      )}

      {status === "connecting" && (
        <h2 data-test-id="status-connecting">Connecting...</h2>
      )}

      {status === "connected" && (
        <h2 data-test-id="status-connected">Connected</h2>
      )}

      <video
        ref={localVideoRef}
        autoPlay
        muted
        className="w-96 border"
        data-test-id="local-video"
      />

      <div
        ref={remoteContainerRef}
        className="flex gap-4 mt-4"
        data-test-id="remote-video-container"
      />

      <div className="mt-4 flex gap-4">

        <button
          onClick={toggleMute}
          data-test-id="mute-mic-button"
          className="px-4 py-2 bg-red-500 text-white rounded"
        >
          {isMuted ? "Unmute Mic" : "Mute Mic"}
        </button>

        <button
          onClick={toggleCamera}
          data-test-id="toggle-camera-button"
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Toggle Camera
        </button>

        <button
          onClick={hangUp}
          data-test-id="hangup-button"
          className="px-4 py-2 bg-black text-white rounded"
        >
          Hang Up
        </button>

      </div>

      <div className="mt-6">

        <div
          data-test-id="chat-log"
          className="border p-2 h-40 overflow-y-auto"
        >
          {messages.map((msg, i) => (
            <div key={i} data-test-id="chat-message">
              {msg}
            </div>
          ))}
        </div>

        <div className="flex mt-2 gap-2">

          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            data-test-id="chat-input"
            className="border p-2 flex-1"
            placeholder="Type message..."
          />

          <button
            onClick={sendMessage}
            data-test-id="chat-submit"
            className="px-4 py-2 bg-green-500 text-white rounded"
          >
            Send
          </button>

        </div>

      </div>

    </div>
  );
}