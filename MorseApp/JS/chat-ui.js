document.addEventListener("click", closeMessageMenus);

messageInput.addEventListener("input", () => {
    previewMorse();

    if (selectedUser) {
        socket.emit("typing", { from: username, to: selectedUser });
    }
});

document.getElementById("searchUser").addEventListener("input", function () {
    const search = this.value.toLowerCase();

    document.querySelectorAll(".user-list-item").forEach((user) => {
        user.style.display = user.innerText.toLowerCase().includes(search) ? "flex" : "none";
    });
});

const profileForm = document.getElementById("profileForm");
const profileAvatarInput = document.getElementById("profileAvatar");
const profileAvatarFileInput = document.getElementById("profileAvatarFile");
const profileAvatarPreview = document.getElementById("profileAvatarPreview");
const profileStatusInput = document.getElementById("profileStatus");
const profileBioInput = document.getElementById("profileBio");
const profileModal = document.getElementById("profileModal");

function syncProfileForm() {
    if (!profileForm) {
        return;
    }

    profileAvatarInput.value = currentProfile.avatar || "";
    profileStatusInput.value = currentProfile.status || "Available";
    profileBioInput.value = currentProfile.bio || "";
    renderProfileAvatarPreview(currentProfile.avatar);
}

function renderProfileAvatarPreview(source) {
    if (!profileAvatarPreview) {
        return;
    }

    if (!source) {
        profileAvatarPreview.hidden = true;
        profileAvatarPreview.innerHTML = "";
        return;
    }

    const imageSource = source.startsWith("/uploads/")
        ? `${SERVER_URL}${source}`
        : source;

    profileAvatarPreview.hidden = false;
    profileAvatarPreview.innerHTML = `
        <img src="${escapeHtml(imageSource)}" alt="Profile photo preview">
        <span>Selected profile photo</span>
    `;
}

function applyProfile(user) {
    currentProfile = {
        avatar: user.avatar || null,
        bio: user.bio || "",
        status: user.status || "Available"
    };
    avatar = currentProfile.avatar;
    localStorage.setItem("avatar", avatar || "");
    localStorage.setItem("bio", currentProfile.bio);
    localStorage.setItem("status", currentProfile.status);
    renderCurrentUserInfo();
    syncProfileForm();
    socket.emit("join", { username, avatar });
}

async function saveProfile(event) {
    event.preventDefault();

    const response = await fetch(`${SERVER_URL}/auth/profile`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
            avatar: profileAvatarInput.value,
            status: profileStatusInput.value,
            bio: profileBioInput.value
        })
    });
    const data = await response.json();

    if (!response.ok) {
        showToast(data.error || "Unable to update profile.");
        return;
    }

    applyProfile(data.user);
    showToast("Profile updated");
}

profileForm?.addEventListener("submit", saveProfile);
syncProfileForm();

profileAvatarFileInput?.addEventListener("change", async function () {
    const file = this.files[0];

    if (!file) {
        return;
    }

    if (!file.type.startsWith("image/")) {
        showToast("Please choose an image file.");
        this.value = "";
        return;
    }

    try {
        setUploadProgress(0, `Uploading profile photo`);
        const upload = await uploadFileWithProgress(file);
        profileAvatarInput.value = upload.path;
        renderProfileAvatarPreview(upload.path);
        showToast("Profile photo ready. Click Save Profile.");
    } catch (error) {
        console.error("Profile photo upload failed:", error);
        showToast(error.message || "Profile photo upload failed.");
    } finally {
        hideUploadProgress();
        this.value = "";
    }
});

function closeUserProfile() {
    if (!profileModal) {
        return;
    }

    profileModal.hidden = true;
    profileModal.innerHTML = "";
}

async function openUserProfile(profileUsername) {
    if (!profileModal) {
        return;
    }

    profileModal.hidden = false;
    profileModal.innerHTML = `
        <div class="profile-modal-card">
            <button type="button" class="profile-modal-close" onclick="closeUserProfile()" aria-label="Close profile">×</button>
            <p>Loading profile...</p>
        </div>
    `;

    try {
        const response = await fetch(`${SERVER_URL}/users/${encodeURIComponent(profileUsername)}/profile`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Unable to load profile.");
        }

        const user = data.user;
        profileModal.innerHTML = `
            <div class="profile-modal-card">
                <button type="button" class="profile-modal-close" onclick="closeUserProfile()" aria-label="Close profile">×</button>
                ${renderAvatar(user.avatar, user.username, "profile-modal-avatar")}
                <h3>${escapeHtml(user.username)}</h3>
                <span>${escapeHtml(user.status || "Available")}</span>
                <p>${escapeHtml(user.bio || "No bio yet.")}</p>
                ${user.lastSeen ? `<small>Last seen ${escapeHtml(new Date(user.lastSeen).toLocaleString())}</small>` : ""}
            </div>
        `;
    } catch (error) {
        profileModal.innerHTML = `
            <div class="profile-modal-card">
                <button type="button" class="profile-modal-close" onclick="closeUserProfile()" aria-label="Close profile">×</button>
                <p>${escapeHtml(error.message || "Unable to load profile.")}</p>
            </div>
        `;
    }
}

const uploadProgress = document.getElementById("uploadProgress");
const uploadProgressLabel = document.getElementById("uploadProgressLabel");
const uploadProgressBar = document.getElementById("uploadProgressBar");
const filePreviewPanel = document.getElementById("filePreviewPanel");
let uploadHideTimer = null;
let pendingFiles = [];

function formatFileSize(bytes = 0) {
    if (bytes < 1024) {
        return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function setUploadProgress(percent, label = "Uploading...") {
    if (!uploadProgress || !uploadProgressBar || !uploadProgressLabel) {
        return;
    }

    clearTimeout(uploadHideTimer);
    uploadProgress.hidden = false;
    uploadProgressLabel.textContent = label;
    uploadProgressBar.style.width = `${Math.max(0, Math.min(100, percent))}%`;
}

function hideUploadProgress() {
    if (!uploadProgress || !uploadProgressBar) {
        return;
    }

    clearTimeout(uploadHideTimer);
    uploadHideTimer = setTimeout(() => {
        uploadProgress.hidden = true;
        uploadProgressBar.style.width = "0%";
    }, 600);
}

function uploadFileWithProgress(file, batchLabel = "") {
    return new Promise((resolve, reject) => {
        const formData = new FormData();
        const request = new XMLHttpRequest();

        formData.append("file", file);
        request.open("POST", `${SERVER_URL}/upload`);
        request.setRequestHeader("Authorization", `Bearer ${token}`);

        request.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                const percent = Math.round((event.loaded / event.total) * 100);
                setUploadProgress(percent, `Uploading ${file.name}${batchLabel} (${formatFileSize(file.size)})`);
            }
        };

        request.onload = () => {
            const upload = JSON.parse(request.responseText || "{}");

            if (request.status >= 200 && request.status < 300) {
                setUploadProgress(100, "Upload complete");
                resolve(upload);
                return;
            }

            reject(new Error(upload.message || "Upload failed"));
        };

        request.onerror = () => reject(new Error("Upload failed"));
        request.send(formData);
    });
}

function buildUploadedMessage(upload) {
    const filePayload = {
        path: upload.path,
        originalName: upload.originalName,
        mimeType: upload.mimeType,
        size: upload.size
    };

    const isImage = upload.mimeType?.startsWith("image/");
    const isAudio = upload.mimeType?.startsWith("audio/");

    return {
        from: username,
        to: selectedUser,
        room: selectedRoom,
        text: "",
        morse: "",
        avatar,
        time: new Date().toLocaleTimeString(),
        image: isImage ? upload.path : null,
        audio: isAudio ? upload.path : null,
        file: isImage || isAudio ? null : filePayload
    };
}

async function sendUploadedFile(file, batchInfo = null) {
    if (!file || (!selectedUser && !selectedRoom)) {
        if (!selectedUser && !selectedRoom) {
            alert("Choose a user or room first");
        }
        return;
    }

    try {
        const batchLabel = batchInfo
            ? ` (${batchInfo.current}/${batchInfo.total})`
            : "";

        setUploadProgress(0, `Preparing ${file.name}${batchLabel}`);
        const upload = await uploadFileWithProgress(file, batchLabel);
        const message = buildUploadedMessage(upload);

        socket.emit(selectedRoom ? "room-message" : "private-message", message, (savedMessage) => {
            if (savedMessage) {
                renderMessage(savedMessage);
            }
        });
    } catch (error) {
        console.error("File upload failed:", error);
        alert(error.message || "File upload failed");
    } finally {
        hideUploadProgress();
    }
}

async function sendUploadedFiles(files) {
    const uploadFiles = [...files].filter(Boolean);

    if (!uploadFiles.length) {
        return;
    }

    for (const [index, file] of uploadFiles.entries()) {
        await sendUploadedFile(file, {
            current: index + 1,
            total: uploadFiles.length
        });
    }
}

function getPreviewIcon(file) {
    if (file.type.startsWith("image/")) return "🖼️";
    if (file.type.startsWith("audio/")) return "🎧";
    if (file.type.startsWith("video/")) return "🎬";
    if (file.type.includes("pdf")) return "📕";
    if (file.type.includes("word")) return "📘";
    if (file.type.includes("excel") || file.type.includes("spreadsheet")) return "📗";
    if (file.type.includes("zip")) return "🗜️";
    return "📄";
}

function hideFilePreview() {
    pendingFiles = [];

    if (filePreviewPanel) {
        filePreviewPanel.hidden = true;
        filePreviewPanel.innerHTML = "";
    }
}

function showFilePreview(files) {
    pendingFiles = [...files].filter(Boolean);

    if (!pendingFiles.length || !filePreviewPanel) {
        return;
    }

    const totalSize = pendingFiles.reduce((sum, file) => sum + file.size, 0);

    filePreviewPanel.hidden = false;
    filePreviewPanel.innerHTML = `
        <div class="file-preview-header">
            <div>
                <strong>${pendingFiles.length} file${pendingFiles.length > 1 ? "s" : ""} selected</strong>
                <small>Total ${formatFileSize(totalSize)}</small>
            </div>
            <button type="button" onclick="hideFilePreview()" aria-label="Cancel selected files">×</button>
        </div>
        <ul class="file-preview-list">
            ${pendingFiles.map((file) => `
                <li>
                    <span>${getPreviewIcon(file)}</span>
                    <div>
                        <strong>${escapeHtml(file.name)}</strong>
                        <small>${escapeHtml(file.type || "file")} · ${formatFileSize(file.size)}</small>
                    </div>
                </li>
            `).join("")}
        </ul>
        <div class="file-preview-actions">
            <button type="button" onclick="hideFilePreview()">Cancel</button>
            <button type="button" onclick="confirmFilePreview()">Send files</button>
        </div>
    `;
}

async function confirmFilePreview() {
    const filesToSend = [...pendingFiles];
    hideFilePreview();
    await sendUploadedFiles(filesToSend);
}

document.getElementById("fileInput").addEventListener("change", async function () {
    showFilePreview(this.files);

    this.value = "";
});

messagesElement.addEventListener("dragover", (event) => {
    event.preventDefault();
    messagesElement.classList.add("drag-over");
});

messagesElement.addEventListener("dragleave", () => {
    messagesElement.classList.remove("drag-over");
});

messagesElement.addEventListener("drop", async (event) => {
    event.preventDefault();
    messagesElement.classList.remove("drag-over");

    showFilePreview(event.dataTransfer.files);
});

document.getElementById("roomSelect").addEventListener("change", function () {
    selectedRoom = this.value;
    selectedUser = null;

    document.querySelectorAll(".user-list-item").forEach((item) => {
        item.classList.remove("active");
    });

    document.getElementById("chatWith").textContent = `# ${selectedRoom}`;
    document.getElementById("typingStatus").textContent = "Room conversation";
    document.getElementById("searchMessages").value = "";
    roomUnreadCounts[selectedRoom] = 0;
    updateRoomBadges();
    pinnedBar.hidden = true;
    socket.emit("join-room", { room: selectedRoom, username });
    socket.emit("load-room-history", selectedRoom);
});

document.getElementById("searchMessages").addEventListener("input", function () {
    const search = this.value.trim().toLowerCase();

    document.querySelectorAll(".message-row").forEach((row) => {
        const message = messageStore.get(row.dataset.messageId);
        const searchable = [
            message?.from,
            message?.text,
            message?.morse,
            message?.replyTo?.text
        ].filter(Boolean).join(" ").toLowerCase();

        row.hidden = Boolean(search) && !searchable.includes(search);
    });
});

function selectUser(user) {
    selectedUser = user;
    selectedRoom = null;
    document.getElementById("roomSelect").value = "";
    unreadCounts[user] = 0;
    updateUsersList();

    document.querySelectorAll(".user-list-item").forEach((item) => {
        item.classList.toggle("active", item.id === `user-${user}`);
    });

    document.getElementById("chatWith").textContent = `Chat with ${user}`;
    document.getElementById("typingStatus").textContent = "Online";
    document.getElementById("searchMessages").value = "";
    pinnedBar.hidden = true;
    socket.emit("load-history", { username, withUser: user });
}

function updateUsersList() {
    document.querySelectorAll("[id^='user-']").forEach((item) => {
        const user = item.id.replace("user-", "");
        const count = unreadCounts[user] || 0;
        const badgeArea = item.querySelector(".badge-area");

        if (badgeArea) {
            badgeArea.innerHTML = count > 0 ? `<span class="unread-badge">${count}</span>` : "";
        }
    });
}

function updateRoomBadges() {
    const roomSelect = document.getElementById("roomSelect");

    [...roomSelect.options].forEach((option) => {
        if (!option.value) {
            return;
        }

        const count = roomUnreadCounts[option.value] || 0;
        option.textContent = count > 0 ? `${option.value} (${count})` : option.value;
    });
}

function previewMorse() {
    const plainText = document.getElementById("plainText");
    const morsePreview = document.getElementById("morsePreview");

    if (plainText) {
        plainText.innerText = messageInput.value;
    }

    if (morsePreview) {
        morsePreview.innerText = convertTextToMorse(messageInput.value);
    }
}

function toggleEmoji() {
    const box = document.getElementById("emojiBox");
    box.hidden = !box.hidden;
}

function addEmoji(emoji) {
    messageInput.value += emoji;
    previewMorse();
    messageInput.focus();
}

async function startRecording() {
    if (!selectedUser && !selectedRoom) {
        alert("Choose a user or room first");
        return;
    }

    if (mediaRecorder?.state === "recording") {
        mediaRecorder.stop();
        document.getElementById("recordBtn").textContent = "🎤";
        return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    mediaRecorder.ondataavailable = (event) => audioChunks.push(event.data);

    mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());

        const formData = new FormData();
        formData.append("file", new Blob(audioChunks, { type: "audio/webm" }), "voice.webm");

        const response = await fetch(`${SERVER_URL}/upload`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`
            },
            body: formData
        });
        const upload = await response.json();

        socket.emit(selectedRoom ? "room-message" : "private-message", {
            from: username,
            to: selectedUser,
            room: selectedRoom,
            text: "",
            morse: "",
            avatar,
            image: null,
            audio: upload.path,
            time: new Date().toLocaleTimeString()
        }, (savedMessage) => {
            if (savedMessage) {
                renderMessage(savedMessage);
            }
        });
    };

    mediaRecorder.start();
    document.getElementById("recordBtn").textContent = "⏹";
}

function toggleTheme() {
    document.body.classList.toggle("light-mode");
    const isLight = document.body.classList.contains("light-mode");
    localStorage.setItem("theme", isLight ? "light" : "dark");
    document.getElementById("themeBtn").textContent = isLight ? "☀ Light Mode" : "🌙 Dark Mode";
}

function toggleSettings() {
    document.getElementById("settingsPanel").classList.toggle("active");
}

function closeSettings() {
    document.getElementById("settingsPanel").classList.remove("active");
}

function openCallHistory() {
    closeSettings();

    if (window.callManager) {
        window.callManager.toggleHistory();
    }
}

function toggleSound() {
    soundEnabled = !soundEnabled;
    alert(soundEnabled ? "Sound ON" : "Sound OFF");
}

function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("avatar");
    window.location = "login.html";
}

function clearChat() {
    messagesElement.innerHTML = "";
    messageStore.clear();
    updatePinnedBar();
}
