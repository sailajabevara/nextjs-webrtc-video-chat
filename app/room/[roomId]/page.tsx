
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

  const isMuted = useRef(false);

  // ⭐ NEW STATUS STATE
  const [status, setStatus] = useState("waiting");

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

    console.log("Mic Enabled:", audioTrack.enabled);

    isMuted.current = !audioTrack.enabled;

  }

  function toggleCamera() {

    if (!localStream.current) return;

    const videoTrack = localStream.current.getVideoTracks()[0];

    if (!videoTrack) return;

    videoTrack.enabled = !videoTrack.enabled;

    console.log("Camera Enabled:", videoTrack.enabled);

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

  return (
    <div className="p-6">

      {/* ⭐ STATUS UI */}
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
          Toggle Mic
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

    </div>
  );
}