

import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

const port = process.env.PORT || 3000;

app.prepare().then(() => {

  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", (socket) => {

    console.log("User connected:", socket.id);

    // USER JOINS ROOM
    socket.on("join-room", (roomId) => {

      socket.join(roomId);

      socket.to(roomId).emit("user-joined", socket.id);

    });

    // OFFER
    socket.on("offer", ({ offer, to }) => {

      io.to(to).emit("offer", {
        offer,
        from: socket.id
      });

    });

    // ANSWER
    socket.on("answer", ({ answer, to }) => {

      io.to(to).emit("answer", {
        answer,
        from: socket.id
      });

    });

    // ICE CANDIDATE
    socket.on("ice-candidate", ({ candidate, to }) => {

      io.to(to).emit("ice-candidate", {
        candidate,
        from: socket.id
      });

    });

    // USER DISCONNECT
    socket.on("disconnect", () => {

      console.log("User disconnected:", socket.id);

      socket.broadcast.emit("user-disconnected", socket.id);

    });

  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });

});