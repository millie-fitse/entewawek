const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

let queue = [];

io.on('connection', socket => {
  socket.on('ready', () => {
    if (queue.length > 0) {
      const peer = queue.shift();
      socket.partner = peer;
      peer.partner = socket;

      socket.emit('matched');
      peer.emit('matched');
    } else {
      queue.push(socket);
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
    if (socket.partner) {
      socket.partner.emit('disconnectPeer');
      socket.partner.partner = null;
    }
    if (queue.includes(socket)) {
      queue = queue.filter(s => s !== socket);
    }
  });
});
http.listen(3000, () => console.log('Running on http://localhost:3000'));
/*const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Running on port ${PORT}`));*/
