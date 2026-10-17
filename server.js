const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

app.use(express.static("public"));

const waiting = [];
const partnerOf = new Map();

function removeFromWaiting(id) {
  const i = waiting.indexOf(id);
  if (i !== -1) waiting.splice(i, 1);
}
function unpair(id, notify = true) {
  removeFromWaiting(id);
  const partner = partnerOf.get(id);
  partnerOf.delete(id);
  if (partner) {
    partnerOf.delete(partner);
    if (notify && io.sockets.sockets.get(partner)) {
      io.to(partner).emit("peer-left");
    }
  }
}
function findPartner(id) {
  removeFromWaiting(id);
  if (partnerOf.has(id)) return;
  let other = null;
  while (waiting.length && !other) {
    const candidate = waiting.shift();
    if (candidate !== id && io.sockets.sockets.has(candidate) && !partnerOf.has(candidate)) other = candidate;
  }
  if (!other) {
    waiting.push(id);
    io.to(id).emit("waiting");
    return;
  }
  partnerOf.set(id, other);
  partnerOf.set(other, id);
  io.to(id).emit("matched", { initiator: true });
  io.to(other).emit("matched", { initiator: false });
}
io.on("connection", socket => {
  socket.on("find-partner", () => findPartner(socket.id));
  socket.on("signal", data => {
    const partner = partnerOf.get(socket.id);
    if (partner && data && ["offer", "answer", "ice"].includes(data.type)) {
      io.to(partner).emit("signal", { type: data.type, data: data.data });
    }
  });
  socket.on("next", () => {
    unpair(socket.id);
    findPartner(socket.id);
  });
  socket.on("leave", () => unpair(socket.id));
  socket.on("disconnect", () => unpair(socket.id));
});

server.listen(PORT, () => console.log(`Free Live Talking running on port ${PORT}`));
