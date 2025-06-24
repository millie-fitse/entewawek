const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const chatBox = document.getElementById('chatBox');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendBtn');

let localStream;
let peer;
let socket = io();
let dataChannel;

// 1. Access camera and mic
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  .then(stream => {
    localStream = stream;
    localVideo.srcObject = stream;
    socket.emit('ready'); // notify server you're ready
  })
  .catch(err => {
    alert('Could not access your camera/mic: ' + err.message);
  });

// 2. When matched with a partner
socket.on('matched', () => {
  createPeerConnection();

  // If you're the first in the pair, you create the offer
  dataChannel = peer.createDataChannel('chat');
  setupDataChannel();

  peer.createOffer()
    .then(offer => peer.setLocalDescription(offer))
    .then(() => {
      socket.emit('signal', { description: peer.localDescription });
    });
});

// 3. Create the WebRTC connection with STUN
function createPeerConnection() {
  peer = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  });

  // Add your video/audio stream
  localStream.getTracks().forEach(track => peer.addTrack(track, localStream));

  // When you get remote stream
  peer.ontrack = e => {
    remoteVideo.srcObject = e.streams[0];
  };

  // ICE candidates
  peer.onicecandidate = e => {
    if (e.candidate) {
      socket.emit('signal', { candidate: e.candidate });
    }
  };

  // If you receive a data channel
  peer.ondatachannel = event => {
    dataChannel = event.channel;
    setupDataChannel();
  };
}

// 4. Handle signaling messages from server
socket.on('signal', async data
