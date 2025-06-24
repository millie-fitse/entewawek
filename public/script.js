const socket = io();
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const chatInput = document.getElementById('chatInput');

let peer = null;
let stream = null;

function appendMessage(text, fromMe = false) {
  const p = document.createElement('p');
  p.textContent = text;
  const box = fromMe ? document.getElementById('myMessages') : document.getElementById('theirMessages');
  box.appendChild(p);
  box.scrollTop = box.scrollHeight;
}

async function start() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = stream;
  } catch (err) {
    alert('Could not access your camera/microphone: ' + err.message);
  }
}

function initConnection() {
  peer = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  });

  // Add all local stream tracks to the connection
  stream.getTracks().forEach(track => peer.addTrack(track, stream));

  // When remote track arrives, show it in remote video element
  peer.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
  };

  // ICE candidates sent to peer via signaling server
  peer.onicecandidate = event => {
    if (event.candidate) {
      socket.emit('signal', { type: 'candidate', candidate: event.candidate });
    }
  };
}

function sendMessage() {
  const msg = chatInput.value.trim();
  if (msg) {
    socket.emit('message', msg);
    appendMessage(msg, true);
    chatInput.value = '';
  }
}

function stopChat() {
  socket.emit('stop');
  endCall();
}

function nextChat() {
  socket.emit('next');
  endCall();
}

function endCall() {
  if (peer) peer.close();
  peer = null;
  remoteVideo.srcObject = null;
  document.getElementById('myMessages').innerHTML = '<h3>You</h3>';
  document.getElementById('theirMessages').innerHTML = '<h3>Stranger</h3>';
}

socket.on('connect', async () => {
  await start();
  socket.emit('ready');
});

socket.on('matched', async () => {
  initConnection();
  const offer = await peer.createOffer();
  await peer.setLocalDescription(offer);
  socket.emit('signal', { type: 'offer', offer });
});

socket.on('signal', async data => {
  if (!peer) initConnection();

  if (data.type === 'offer') {
    await peer.setRemoteDescription(new RTCSessionDescription(data.offer));
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    socket.emit('signal', { type: 'answer', answer });
  } else if (data.type === 'answer') {
    await peer.setRemoteDescription(new RTCSessionDescription(data.answer));
  } else if (data.type === 'candidate') {
    try {
      await peer.addIceCandidate(new RTCIceCandidate(data.candidate));
    } catch (err) {
      console.error('Error adding ICE candidate:', err);
    }
  }
});

socket.on('disconnectPeer', () => {
  appendMessage('Stranger disconnected.');
  endCall();
});

socket.on('message', msg => {
  appendMessage(msg, false);
});

// Optional: send message on Enter keypress
chatInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    sendMessage();
  }
});
