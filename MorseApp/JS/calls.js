class CallManager {
    constructor(socketInstance) {
        this.socket = socketInstance;
        this.peer = null;
        this.localStream = null;
        this.remoteStream = null;
        this.activeUser = null;
        this.callType = null;
        this.callId = null;
        this.callStartedAt = null;
        this.timer = null;
        this.callPanel = document.getElementById("callPanel");
        this.callHistoryPanel = document.getElementById("callHistoryPanel");
        this.callHistory = [];
        this.ringtoneContext = null;
        this.ringtoneTimer = null;
        this.ringtoneGain = null;
        this.videoFallbackTimer = null;
        this.videoFallbackCanvas = document.createElement("canvas");
        this.lastRemoteVideoFrameAt = 0;
        this.preferFrameVideo = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
            || document.documentElement.classList.contains("is-capacitor")
            || document.body.classList.contains("is-capacitor");
        this.bindSignalingEvents();
    }

    showPanel(html) {
        this.callPanel.innerHTML = html;
        this.callPanel.hidden = false;
    }

    hidePanel() {
        this.callPanel.hidden = true;
        this.callPanel.innerHTML = "";
    }

    requestHistory() {
        this.socket.emit("load-call-history");
    }

    toggleHistory() {
        if (this.callHistoryPanel.hidden) {
            this.requestHistory();
            this.renderHistory();
            this.callHistoryPanel.hidden = false;
        } else {
            this.callHistoryPanel.hidden = true;
        }
    }

    renderHistory() {
        const rows = this.callHistory.map((call) => {
            const otherUser = call.from === username ? call.to : call.from;
            const direction = call.from === username ? "Outgoing" : "Incoming";
            const createdAt = call.createdAt
                ? new Date(call.createdAt).toLocaleString()
                : "Unknown time";
            const statusIcon = {
                ringing: "🔔",
                answered: "✅",
                ended: "📞",
                missed: "❌",
                declined: "⛔"
            }[call.status] || "📞";

            return `
                <li class="call-history-item">
                    <span>${statusIcon}</span>
                    <div>
                        <strong>${direction} ${call.type || "audio"} call</strong>
                        <small>${otherUser || "Unknown"} · ${call.status || "ended"} · ${this.formatDuration(call.durationSeconds || 0)}</small>
                        <small>${createdAt}</small>
                    </div>
                </li>
            `;
        }).join("");

        this.callHistoryPanel.innerHTML = `
            <div class="call-history-header">
                <h3>Call History</h3>
                <button type="button" onclick="callManager.toggleHistory()" aria-label="Close call history">×</button>
            </div>
            <ul class="call-history-list">
                ${rows || `<li class="call-history-empty">No calls yet</li>`}
            </ul>
        `;
    }

    formatDuration(totalSeconds = 0) {
        const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
        const seconds = String(totalSeconds % 60).padStart(2, "0");
        return `${minutes}:${seconds}`;
    }

    startTimer() {
        this.stopTimer();
        this.callStartedAt = Date.now();
        this.timer = setInterval(() => {
            const timerElement = document.getElementById("callTimer");

            if (timerElement && this.callStartedAt) {
                timerElement.textContent = this.formatDuration(
                    Math.floor((Date.now() - this.callStartedAt) / 1000)
                );
            }
        }, 1000);
    }

    stopTimer() {
        clearInterval(this.timer);
        this.timer = null;
    }

    showEndedCall(durationSeconds = 0) {
        this.showPanel(`
            <h3>Call ended</h3>
            <span class="call-status ended">Ended</span>
            <p>${durationSeconds ? `Duration ${this.formatDuration(durationSeconds)}` : "The call has finished."}</p>
        `);

        setTimeout(() => {
            if (!this.activeUser && !this.peer) {
                this.hidePanel();
            }
        }, 2200);
    }

    showActiveCall(message) {
        const callLabel = this.callType === "screen"
            ? "Screen share"
            : (this.callType === "video" ? "Video" : "Voice");
        const callIcon = this.callType === "screen"
            ? "🖥️"
            : (this.callType === "video" ? "🎥" : "📞");

        this.showPanel(`
            <div class="call-shell call-${this.callType || "audio"}">
                <div class="call-topline">
                    <div class="call-icon">${callIcon}</div>
                    <div>
                        <h3>${message}</h3>
                        <p>${callLabel} with ${this.activeUser}</p>
                    </div>
                </div>
                <div class="call-meta">
                    <span id="callStatus" class="call-status">Ringing</span>
                    <strong id="callTimer" class="call-timer">00:00</strong>
                </div>
            </div>
            <div id="callMediaArea" class="call-media-area call-media-${this.callType || "audio"}">
                <div class="local-preview-wrap">
                    <span>Local preview</span>
                    <div id="localCallPreview" class="local-call-preview"></div>
                </div>
                <div class="remote-preview-wrap">
                    <span>Remote</span>
                    <div id="remoteCallPreview" class="remote-call-preview"></div>
                </div>
            </div>
            <div class="call-controls">
                <button id="toggleMicBtn" type="button" onclick="callManager.toggleAudio()">Mute</button>
                <button id="toggleCameraBtn" type="button" onclick="callManager.toggleVideo()">Camera off</button>
                <button id="stopSharingBtn" type="button" onclick="callManager.stopSharing()">Stop sharing</button>
            </div>
            <div class="call-actions">
                <button class="call-end" type="button" onclick="callManager.end()">End call</button>
            </div>
        `);

        this.attachLocalMedia();
        this.attachRemoteMedia();
        this.updateCallControls();
    }

    updateCallStatus(status, tone = "neutral") {
        const statusElement = document.getElementById("callStatus");

        if (!statusElement) {
            return;
        }

        statusElement.textContent = status;
        statusElement.className = `call-status ${tone}`;
    }

    stopRingtone() {
        clearInterval(this.ringtoneTimer);
        this.ringtoneTimer = null;

        if (this.ringtoneGain) {
            try {
                this.ringtoneGain.gain.setTargetAtTime(0, this.ringtoneContext.currentTime, 0.04);
            } catch {
                // Ignore audio context shutdown timing issues.
            }
        }
    }

    playRingtone(direction = "incoming", callType = this.callType || "audio") {
        this.stopRingtone();

        const AudioContextClass = window.AudioContext || window.webkitAudioContext;

        if (!AudioContextClass) {
            return;
        }

        try {
            this.ringtoneContext = this.ringtoneContext || new AudioContextClass();

            if (this.ringtoneContext.state === "suspended") {
                this.ringtoneContext.resume().catch(() => {});
            }

            this.ringtoneGain = this.ringtoneContext.createGain();
            this.ringtoneGain.gain.value = 0.032;
            this.ringtoneGain.connect(this.ringtoneContext.destination);

            const patterns = {
                audio: {
                    incoming: [523.25, 659.25, 783.99, 659.25],
                    outgoing: [392, 493.88, 587.33]
                },
                video: {
                    incoming: [659.25, 880, 987.77, 880, 739.99],
                    outgoing: [440, 554.37, 659.25, 830.61]
                },
                screen: {
                    incoming: [587.33, 739.99, 880, 739.99],
                    outgoing: [369.99, 493.88, 659.25]
                }
            };
            const family = patterns[callType] || patterns.audio;
            const pattern = family[direction] || family.incoming;
            const waveType = callType === "video" ? "triangle" : "sine";
            const pulseLength = callType === "video" ? 0.16 : 0.2;
            const pulseGap = direction === "outgoing"
                ? (callType === "video" ? 480 : 560)
                : (callType === "video" ? 360 : 460);
            let noteIndex = 0;

            const playPulse = () => {
                if (!this.ringtoneContext || !this.ringtoneGain) {
                    return;
                }

                const oscillator = this.ringtoneContext.createOscillator();
                oscillator.type = waveType;
                oscillator.frequency.value = pattern[noteIndex % pattern.length];
                oscillator.connect(this.ringtoneGain);
                oscillator.start();
                oscillator.stop(this.ringtoneContext.currentTime + pulseLength);
                noteIndex += 1;
            };

            playPulse();
            this.ringtoneTimer = setInterval(playPulse, pulseGap);
        } catch (error) {
            console.warn("Ringtone could not be started:", error);
        }
    }

    createPeer() {
        const peer = new RTCPeerConnection({
            iceServers: [
                { urls: "stun:stun.l.google.com:19302" }
            ]
        });

        peer.onicecandidate = (event) => {
            if (event.candidate && this.activeUser) {
                this.socket.emit("ice-candidate", {
                    from: username,
                    to: this.activeUser,
                    callId: this.callId,
                    candidate: event.candidate
                });
            }
        };

        peer.ontrack = (event) => {
            this.remoteStream = event.streams[0];
            this.attachRemoteMedia();
            this.updateCallControls();
        };

        peer.onconnectionstatechange = () => {
            if (["failed", "closed", "disconnected"].includes(peer.connectionState)) {
                this.cleanup(false);
            }
        };

        this.peer = peer;
        return peer;
    }

    async getLocalMedia(type, role = "caller") {
        const isAnsweringScreenShare = type === "screen" && role === "callee";

        if (isAnsweringScreenShare) {
            // Screen sharing is one-way: the caller shares their screen, the receiver only subscribes.
            this.localStream = new MediaStream();
            return this.localStream;
        }

        if (type === "screen") {
            this.localStream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true
            });

            this.localStream.getVideoTracks()[0]?.addEventListener("ended", () => {
                this.end();
            });

            return this.localStream;
        }

        this.localStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            },
            video: type === "video"
                ? {
                    facingMode: "user",
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
                : false
        });

        return this.localStream;
    }

    async start(targetUser, type) {
        if (!targetUser) {
            alert("Choose a user before starting a call");
            return;
        }

        if (this.activeUser || this.peer) {
            alert("You are already in a call.");
            return;
        }

        this.activeUser = targetUser;
        this.callType = type;
        this.callId = crypto.randomUUID();

        const peer = this.createPeer();
        const stream = await this.getLocalMedia(type, "caller");
        stream.getTracks().forEach((track) => peer.addTrack(track, stream));

        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);

        this.socket.emit("call-offer", {
            from: username,
            to: targetUser,
            type,
            callId: this.callId,
            offer
        });

        this.showActiveCall("Calling...");
        this.playRingtone("outgoing", type);
    }

    async answer(data) {
        this.stopRingtone();
        this.activeUser = data.from;
        this.callType = data.type;
        this.callId = data.callId;

        const peer = this.createPeer();
        const stream = await this.getLocalMedia(data.type, "callee");
        stream.getTracks().forEach((track) => peer.addTrack(track, stream));

        await peer.setRemoteDescription(data.offer);
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);

        this.socket.emit("call-answer", {
            from: username,
            to: data.from,
            callId: data.callId,
            answer
        });

        this.showActiveCall("Call connected");
        this.updateCallStatus("Connected", "connected");
        this.startTimer();
    }

    bindSignalingEvents() {
        this.socket.on("incoming-call", (data) => {
            if (this.activeUser || this.peer) {
                this.socket.emit("end-call", {
                    from: username,
                    to: data.from,
                    callId: data.callId,
                    reason: "declined"
                });
                showToast(`${data.from} tried to call, but you are already in a call.`);
                return;
            }

            const incomingLabel = data.type === "screen"
                ? "Screen share"
                : (data.type === "video" ? "Video" : "Voice");

            this.callId = data.callId;
            this.playRingtone("incoming", data.type);
            this.showPanel(`
                <div class="incoming-call-card">
                    <span class="incoming-call-badge">${incomingLabel}</span>
                    <div class="incoming-call-avatar">${String(data.from || "?").charAt(0).toUpperCase()}</div>
                    <h3>${data.from} is calling</h3>
                    <p>Incoming ${incomingLabel.toLowerCase()} call</p>
                </div>
                <div class="call-actions">
                    <button class="call-accept" type="button" id="acceptCallBtn">Accept</button>
                    <button class="call-decline" type="button" id="declineCallBtn">Decline</button>
                </div>
            `);

            document.getElementById("acceptCallBtn").onclick = () => {
                this.answer(data).catch((error) => {
                    console.error("Unable to answer call:", error);
                    alert("Camera or microphone access could not be started.");
                    this.cleanup();
                });
            };

            document.getElementById("declineCallBtn").onclick = () => {
                this.stopRingtone();
                this.socket.emit("end-call", {
                    from: username,
                    to: data.from,
                    callId: data.callId,
                    reason: "declined"
                });
                this.cleanup();
            };
        });

        this.socket.on("call-answered", async (data) => {
            if (this.peer) {
                this.stopRingtone();
                await this.peer.setRemoteDescription(data.answer);
                this.showActiveCall("Call connected");
                this.updateCallStatus("Connected", "connected");
                this.startTimer();
            }
        });

        this.socket.on("ice-candidate", async (data) => {
            if (this.peer && data.candidate) {
                await this.peer.addIceCandidate(data.candidate);
            }
        });

        this.socket.on("call-video-frame", (data) => {
            if (!this.callId || data?.callId !== this.callId || data?.from !== this.activeUser || !data?.frame) {
                return;
            }

            this.showRemoteFallbackFrame(data.frame);
        });

        this.socket.on("call-ended", (data) => {
            const durationSeconds = data?.durationSeconds || 0;
            this.cleanup(false);
            this.showEndedCall(durationSeconds);
            showToast(`Call ended${data?.durationSeconds ? ` (${this.formatDuration(data.durationSeconds)})` : ""}`);
            this.requestHistory();
        });

        this.socket.on("call-busy", (data) => {
            this.cleanup(false);
            this.showPanel(`
                <h3>Call unavailable</h3>
                <span class="call-status busy">Busy</span>
                <p>${data?.to || "User"} is already in a call.</p>
            `);
            setTimeout(() => this.hidePanel(), 2200);
            showToast(`${data?.to || "User"} is already in a call.`);
            this.requestHistory();
        });

        this.socket.on("call-history", (calls) => {
            this.callHistory = Array.isArray(calls) ? calls : [];

            if (!this.callHistoryPanel.hidden) {
                this.renderHistory();
            }
        });

        this.socket.on("connect", () => this.requestHistory());
    }

    attachRemoteMedia() {
        const mediaArea = document.getElementById("remoteCallPreview");

        if (!mediaArea || !this.remoteStream) {
            return;
        }

        const videoTracks = this.remoteStream.getVideoTracks().filter((track) => track.readyState !== "ended");
        const audioTracks = this.remoteStream.getAudioTracks().filter((track) => track.readyState !== "ended");
        const hasVideo = videoTracks.length > 0;
        let media = document.getElementById("remoteCallMedia");

        if (media && media.tagName !== "VIDEO") {
            media.remove();
            media = null;
        }

        if (hasVideo && !this.preferFrameVideo && !media) {
            media = document.createElement("video");
            media.id = "remoteCallMedia";
            media.autoplay = true;
            media.playsInline = true;
            media.controls = false;
            media.className = "remote-call-media";
            mediaArea.appendChild(media);
        }

        mediaArea.classList.toggle("has-video", hasVideo);
        mediaArea.querySelector(".call-audio-placeholder")?.remove();

        if (hasVideo && !this.preferFrameVideo) {
            const videoOnlyStream = new MediaStream(videoTracks);
            media.muted = true;
            media.volume = 0;
            media.srcObject = videoOnlyStream;
            mediaArea.querySelector(".call-media-unlock")?.remove();
            this.playMediaElement(media, mediaArea, "Tap to show video");
        } else if (hasVideo && this.preferFrameVideo) {
            media?.remove();
            this.renderVideoFramePlaceholder(mediaArea);
        } else {
            media?.remove();
            this.renderAudioPlaceholder(mediaArea, "Remote audio", false);
        }

        this.attachRemoteAudio(audioTracks, mediaArea);
    }

    attachRemoteAudio(audioTracks, mediaArea) {
        let audio = document.getElementById("remoteCallAudio");

        if (!audioTracks.length) {
            audio?.remove();
            return;
        }

        if (!audio) {
            audio = document.createElement("audio");
            audio.id = "remoteCallAudio";
            audio.autoplay = true;
            audio.playsInline = true;
            audio.controls = false;
            audio.className = "remote-call-audio";
            mediaArea.appendChild(audio);
        }

        audio.muted = false;
        audio.volume = 1;
        audio.srcObject = new MediaStream(audioTracks);
        this.playMediaElement(audio, mediaArea, "Tap to play audio");
    }

    attachLocalMedia() {
        const preview = document.getElementById("localCallPreview");

        if (!preview || !this.localStream) {
            return;
        }

        preview.innerHTML = "";

        const hasVideo = this.localStream.getVideoTracks().length > 0;
        const media = document.createElement(hasVideo ? "video" : "audio");
        media.autoplay = true;
        media.muted = true;
        media.playsInline = true;
        media.controls = !hasVideo;
        media.className = "local-call-media";
        media.srcObject = this.localStream;
        preview.appendChild(media);
        this.renderAudioPlaceholder(preview, "Your microphone", hasVideo);
        this.playMediaElement(media, preview, "Tap to start preview");

        if (hasVideo) {
            this.startVideoFallback(media);
        }
    }

    startVideoFallback(localVideo) {
        this.stopVideoFallback();

        this.videoFallbackTimer = setInterval(() => {
            if (!this.activeUser || !this.callId || this.callType !== "video" || !localVideo.videoWidth) {
                return;
            }

            const canvas = this.videoFallbackCanvas;
            const sourceRatio = localVideo.videoWidth / Math.max(localVideo.videoHeight, 1);
            canvas.width = 260;
            canvas.height = Math.max(180, Math.min(360, Math.round(canvas.width / sourceRatio)));
            const context = canvas.getContext("2d", { willReadFrequently: false });

            if (!context) {
                return;
            }

            context.drawImage(localVideo, 0, 0, canvas.width, canvas.height);
            const frame = canvas.toDataURL("image/jpeg", 0.46);

            this.socket.emit("call-video-frame", {
                from: username,
                to: this.activeUser,
                callId: this.callId,
                frame
            });
        }, 850);
    }

    stopVideoFallback() {
        clearInterval(this.videoFallbackTimer);
        this.videoFallbackTimer = null;
    }

    showRemoteFallbackFrame(frame) {
        const mediaArea = document.getElementById("remoteCallPreview");

        if (!mediaArea) {
            return;
        }

        this.lastRemoteVideoFrameAt = Date.now();

        let fallback = document.getElementById("remoteFallbackFrame");

        if (!fallback) {
            fallback = document.createElement("img");
            fallback.id = "remoteFallbackFrame";
            fallback.className = "remote-fallback-frame";
            fallback.alt = "Remote camera fallback";
            mediaArea.appendChild(fallback);
        }

        fallback.src = frame;
        mediaArea.classList.add("has-fallback-frame");
        mediaArea.querySelector(".call-video-waiting")?.remove();

        const video = document.getElementById("remoteCallMedia");

        if (!this.preferFrameVideo && video && video.tagName === "VIDEO") {
            const hideFallbackIfVideoWorks = () => {
                if (video.readyState >= 2 && !video.paused && video.videoWidth > 0) {
                    mediaArea.classList.remove("has-fallback-frame");
                }
            };

            setTimeout(hideFallbackIfVideoWorks, 1200);
        }
    }

    renderVideoFramePlaceholder(container) {
        if (!container || container.querySelector(".call-video-waiting")) {
            return;
        }

        container.insertAdjacentHTML("beforeend", `
            <div class="call-video-waiting">
                <span class="call-wave"><i></i><i></i><i></i><i></i></span>
                <strong>Waiting for remote camera</strong>
                <small>Using mobile-safe video mode</small>
            </div>
        `);
    }

    renderAudioPlaceholder(container, label, hasVideo = ["video", "screen"].includes(this.callType)) {
        if (!container || hasVideo) {
            return;
        }

        if (container.querySelector(".call-audio-placeholder")) {
            return;
        }

        container.insertAdjacentHTML("beforeend", `
            <div class="call-audio-placeholder">
                <span class="call-wave"><i></i><i></i><i></i><i></i></span>
                <strong>${label}</strong>
                <small>Audio is active</small>
            </div>
        `);
    }

    playMediaElement(media, container, label) {
        if (!media || !container) {
            return;
        }

        const tryPlay = () => {
            const result = media.play?.();

            if (result && typeof result.catch === "function") {
                result
                    .then(() => {
                        container.querySelector(".call-media-unlock")?.remove();
                    })
                    .catch(() => {
                        if (container.querySelector(".call-media-unlock")) {
                            return;
                        }

                        const button = document.createElement("button");
                        button.type = "button";
                        button.className = "call-media-unlock";
                        button.textContent = label;
                        button.onclick = () => {
                            media.play?.().then(() => button.remove()).catch(() => {});
                        };
                        container.appendChild(button);
                    });
            }
        };

        if (media.readyState >= 2) {
            tryPlay();
        } else {
            media.onloadedmetadata = tryPlay;
        }
    }

    updateCallControls() {
        const audioTrack = this.localStream?.getAudioTracks()[0];
        const videoTrack = this.localStream?.getVideoTracks()[0];
        const micButton = document.getElementById("toggleMicBtn");
        const cameraButton = document.getElementById("toggleCameraBtn");
        const stopSharingButton = document.getElementById("stopSharingBtn");

        if (micButton) {
            micButton.hidden = !audioTrack;
            micButton.textContent = audioTrack?.enabled ? "Mute" : "Unmute";
        }

        if (cameraButton) {
            cameraButton.hidden = this.callType !== "video" || !videoTrack;
            cameraButton.textContent = videoTrack?.enabled ? "Camera off" : "Camera on";
        }

        if (stopSharingButton) {
            stopSharingButton.hidden = this.callType !== "screen" || !videoTrack;
        }
    }

    toggleAudio() {
        const audioTrack = this.localStream?.getAudioTracks()[0];

        if (!audioTrack) {
            return;
        }

        audioTrack.enabled = !audioTrack.enabled;
        this.updateCallControls();
    }

    toggleVideo() {
        const videoTrack = this.localStream?.getVideoTracks()[0];

        if (!videoTrack || this.callType !== "video") {
            return;
        }

        videoTrack.enabled = !videoTrack.enabled;
        this.updateCallControls();
    }

    stopSharing() {
        if (this.callType !== "screen") {
            return;
        }

        this.end();
    }

    end() {
        if (this.activeUser) {
            this.socket.emit("end-call", {
                from: username,
                to: this.activeUser,
                callId: this.callId,
                reason: "ended"
            });
        }

        this.cleanup();
    }

    cleanup(hidePanel = true) {
        this.stopRingtone();
        this.stopTimer();
        this.stopVideoFallback();
        this.localStream?.getTracks().forEach((track) => track.stop());
        this.peer?.close();
        document.getElementById("remoteCallMedia")?.remove();
        document.getElementById("remoteCallAudio")?.remove();
        document.getElementById("remoteFallbackFrame")?.remove();

        if (hidePanel) {
            this.hidePanel();
        }

        this.peer = null;
        this.localStream = null;
        this.remoteStream = null;
        this.activeUser = null;
        this.callType = null;
        this.callId = null;
        this.callStartedAt = null;
    }
}

const callManager = new CallManager(socket);
window.callManager = callManager;

function startCall(type) {
    callManager.start(selectedUser, type).catch((error) => {
        console.error("Unable to start call:", error);
        alert("Camera or microphone access could not be started.");
    });
}
