const socket = io();
const remoteVideo = document.getElementById("remoteVideo");
const localVideo = document.getElementById("localVideo");
const remotePlaceholder = document.getElementById("remotePlaceholder");
const statusTitle = document.getElementById("statusTitle");
const statusText = document.getElementById("statusText");
const connectionLabel = document.getElementById("connectionLabel");
const youTile = document.querySelector(".you-tile");
const startBtn = document.getElementById("startBtn");
const micBtn = document.getElementById("micBtn");
const camBtn = document.getElementById("camBtn");
const nextBtn = document.getElementById("nextBtn");
const stopBtn = document.getElementById("stopBtn");

let localStream = null;
let peer = null;
let matched = false;
let micOn = true;
let camOn = true;
let busy = false;

function status(title, message, label = "Not connected") {
  statusTitle.textContent = title;
  statusText.textContent = message;
  connectionLabel.textContent = label;
}
function showPlaceholder(show) {
  remotePlaceholder.style.display = show ? "flex" : "none";
  remoteVideo.style.display = show ? "none" : "block";
}
function closePeer() {
  if (peer) { peer.ontrack = null; peer.onicecandidate = null; peer.close(); peer = null; }
  remoteVideo.srcObject = null;
  matched = false;
  showPlaceholder(true);
  connectionLabel.textContent = "Not connected";
}
function makePeer() {
  peer = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
  });
  localStream.getTracks().forEach(track => peer.addTrack(track, localStream));
  peer.ontrack = event => {
    remoteVideo.srcObject = event.streams[0];
    showPlaceholder(false);
    connectionLabel.textContent = "Connected";
  };
  peer.onicecandidate = event => {
    if (event.candidate) socket.emit("signal", { type: "ice", data: event.candidate });
  };
  peer.onconnectionstatechange = () => {
    if (peer && ["failed", "disconnected", "closed"].includes(peer.connectionState)) {
      status("Call disconnected", "Try finding another person.", "Disconnected");
    }
  };
}
async function getMedia() {
  if (localStream) return;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error("Camera access needs HTTPS or localhost. Open this site over a secure connection.");
  }
  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  localVideo.srcObject = localStream;
  youTile.style.display = "block";
  micBtn.disabled = camBtn.disabled = nextBtn.disabled = stopBtn.disabled = false;
}
async function startSearch() {
  if (busy) return;
  busy = true;
  startBtn.disabled = true;
  try {
    await getMedia();
    closePeer();
    status("Finding someone…", "Please wait while we match you with another person.", "Searching");
    startBtn.querySelector("span").textContent = "Searching…";
    socket.emit("find-partner");
  } catch (err) {
    status("Permission needed", err.message || "Please allow camera and microphone access.");
    startBtn.disabled = false;
    startBtn.querySelector("span").textContent = "Try again";
  } finally { busy = false; }
}
function stopCall() {
  socket.emit("leave");
  closePeer();
  if (localStream) localStream.getTracks().forEach(t => t.stop());
  localStream = null;
  localVideo.srcObject = null;
  youTile.style.display = "none";
  startBtn.disabled = false;
  startBtn.querySelector("span").textContent = "Start chatting";
  micBtn.disabled = camBtn.disabled = nextBtn.disabled = stopBtn.disabled = true;
  status("Ready when you are", "Start chatting to find a random partner.");
}
startBtn.addEventListener("click", startSearch);
stopBtn.addEventListener("click", stopCall);
nextBtn.addEventListener("click", () => {
  if (!localStream) return;
  closePeer();
  status("Finding someone…", "Searching for your next conversation.", "Searching");
  socket.emit("next");
});
micBtn.addEventListener("click", () => {
  if (!localStream) return;
  micOn = !micOn;
  localStream.getAudioTracks().forEach(t => t.enabled = micOn);
  micBtn.querySelector("span").textContent = micOn ? "Mic on" : "Mic off";
  micBtn.style.opacity = micOn ? "1" : ".65";
});
camBtn.addEventListener("click", () => {
  if (!localStream) return;
  camOn = !camOn;
  localStream.getVideoTracks().forEach(t => t.enabled = camOn);
  camBtn.querySelector("span").textContent = camOn ? "Camera on" : "Camera off";
  camBtn.style.opacity = camOn ? "1" : ".65";
});
socket.on("waiting", () => status("Looking for a partner…", "Keep this page open. You’ll connect when someone else joins.", "Searching"));
socket.on("matched", async ({ initiator }) => {
  if (!localStream) return;
  closePeer();
  matched = true;
  makePeer();
  status("You’re matched!", "Say hello and enjoy your conversation.", "Connecting");
  if (initiator) {
    try {
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      socket.emit("signal", { type: "offer", data: peer.localDescription });
    } catch (e) { status("Could not start call", "Tap Next to try another person."); }
  }
});
socket.on("signal", async ({ type, data }) => {
  if (!peer) return;
  try {
    if (type === "offer") {
      await peer.setRemoteDescription(data);
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      socket.emit("signal", { type: "answer", data: peer.localDescription });
    } else if (type === "answer") {
      await peer.setRemoteDescription(data);
    } else if (type === "ice") {
      try { await peer.addIceCandidate(data); } catch (e) { /* Candidate can arrive before remote description. */ }
    }
  } catch (e) { console.error("WebRTC negotiation error", e); }
});
socket.on("peer-left", () => {
  closePeer();
  status("They left the chat", "Tap Next to meet someone else, or end the session.", "Partner left");
});
window.addEventListener("beforeunload", () => {
  socket.emit("leave");
  if (localStream) localStream.getTracks().forEach(t => t.stop());
});