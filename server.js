const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: { origin: "*" }
});

app.use(express.static('public'));

let queue = [];

io.on('connection', socket => {
  console.log('A user connected:', socket.id);

  socket.on('ready', () => {
    console.log(`User ready: ${socket.id}`);
    if (queue.length > 0) {
      const peer = queue.shift();
      socket.partner = peer;
      peer.partner = socket;

      socket.emit('matched');
      peer.emit('matched');
    } else {
      queue.push(socket);
      console.log('User added to queue:', socket.id);
    }
  });

  socket.on('signal', data => {
    if (socket.partner) {
      socket.partner.emit('signal', data);
    }
  });

  socket.on('message', msg => {
    if (socket.partner) {
      socket.partner.emit('message', msg);
    }
  });

  socket.on('stop', () => {
    if (socket.partner) {
      socket.partner.emit('disconnectPeer');
      socket.partner.partner = null;
    }
    socket.partner = null;
  });

  socket.on('next', () => {
    socket.emit('disconnectPeer');
    if (socket.partner) {
      socket.partner.emit('disconnectPeer');
      socket.partner.partner = null;
    }
    socket.partner = null;
    queue.push(socket);
    socket.emit('ready');
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    if (socket.partner) {
      socket.partner.emit('disconnectPeer');
      socket.partner.partner = null;
    }
    queue = queue.filter(s => s !== socket);
  });
});

// ✅ Use dynamic port when deployed, fallback to 3000 locally
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));
