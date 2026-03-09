"use client";

import { useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { io } from "socket.io-client";

const socket = io();

export default function RoomPage() {

  const { roomId } = useParams();
  const localVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {

    async function startCamera() {

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      socket.emit("join-room", roomId);

    }

    startCamera();

  }, []);

  return (
    <div className="p-6">

      <h2 data-test-id="status-waiting">
        Waiting for others...
      </h2>

      <video
        data-test-id="local-video"
        ref={localVideoRef}
        autoPlay
        muted
        className="w-96 border"
      />

      <div data-test-id="remote-video-container"></div>

    </div>
  );
}