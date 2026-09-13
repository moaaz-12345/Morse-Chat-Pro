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

function renderProfilePreviewMarkup(source, label = "Selected profile photo") {
    if (!source) {
        return "";
    }

    const imageSource = source.startsWith("/uploads/")
        ? `${SERVER_URL}${source}`
        : source;

    return `
        <div class="profile-avatar-preview">
            <img src="${escapeHtml(imageSource)}" alt="Profile photo preview">
            <span>${escapeHtml(label)}</span>
        </div>
    `;
}

function persistUserPreferences() {
    localStorage.setItem("mutedUsers", JSON.stringify([...new Set(mutedUsers)]));
    localStorage.setItem("blockedUsers", JSON.stringify([...new Set(blockedUsers)]));
    localStorage.setItem("blockWindows", JSON.stringify(blockWindows));
}

function applyUserPreferences(preferences = {}) {
    mutedUsers = Array.isArray(preferences.mutedUsers) ? preferences.mutedUsers : mutedUsers;
    blockedUsers = Array.isArray(preferences.blockedUsers) ? preferences.blockedUsers : blockedUsers;
    blockWindows = Array.isArray(preferences.blockWindows) ? preferences.blockWindows : blockWindows;
    persistUserPreferences();
    updateUsersList();
}

async function loadUserPreferences() {
    try {
        const response = await fetch(`${SERVER_URL}/auth/preferences`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        const preferences = await response.json();

        if (!response.ok) {
            throw new Error(preferences.error || "Unable to load preferences.");
        }

        applyUserPreferences(preferences);
    } catch (error) {
        console.warn("Using local mute/block preferences:", error.message);
        applyUserPreferences({ mutedUsers, blockedUsers, blockWindows });
    }
}

async function loadCurrentUserProfile() {
    try {
        const response = await fetch(`${SERVER_URL}/auth/me`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Unable to load profile.");
        }

        applyProfile(data.user);
    } catch (error) {
        console.warn("Using cached profile:", error.message);
    }
}

async function saveUserPreference(profileUsername, changes) {
    const response = await fetch(`${SERVER_URL}/auth/preferences/${encodeURIComponent(profileUsername)}`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(changes)
    });
    const preferences = await response.json();

    if (!response.ok) {
        throw new Error(preferences.error || "Unable to update preferences.");
    }

    applyUserPreferences(preferences);
}

function isUserMuted(profileUsername) {
    return mutedUsers.includes(profileUsername);
}

function isUserBlocked(profileUsername) {
    return blockedUsers.includes(profileUsername);
}

function getMessageTimestamp(message) {
    const dateValue = message?.createdAt || message?.timestamp || null;
    const timestamp = dateValue ? new Date(dateValue).getTime() : Date.now();

    return Number.isFinite(timestamp) ? timestamp : Date.now();
}

function wasMessageSentDuringBlock(message) {
    if (!message?.from || message.from === username) {
        return false;
    }

    const messageTime = getMessageTimestamp(message);

    return blockWindows.some((window) => {
        if (window.username !== message.from || !window.blockedAt) {
            return false;
        }

        const blockedAt = new Date(window.blockedAt).getTime();
        const unblockedAt = window.unblockedAt
            ? new Date(window.unblockedAt).getTime()
            : Infinity;

        return messageTime >= blockedAt && messageTime <= unblockedAt;
    });
}

async function toggleUserMute(profileUsername) {
    const nextMuted = !isUserMuted(profileUsername);

    try {
        await saveUserPreference(profileUsername, {
            muted: nextMuted,
            blocked: isUserBlocked(profileUsername)
        });
        showToast(`${profileUsername} notifications ${nextMuted ? "muted" : "unmuted"}`);
    } catch (error) {
        showToast(error.message || "Unable to update mute setting.");
    }

    openUserProfile(profileUsername);
}

async function toggleUserBlock(profileUsername) {
    const nextBlocked = !isUserBlocked(profileUsername);

    try {
        await saveUserPreference(profileUsername, {
            muted: isUserMuted(profileUsername),
            blocked: nextBlocked
        });

        showToast(`${profileUsername} ${nextBlocked ? "blocked" : "unblocked"}`);

        if (nextBlocked) {
            unreadCounts[profileUsername] = 0;
        }
    } catch (error) {
        showToast(error.message || "Unable to update block setting.");
        openUserProfile(profileUsername);
        return;
    }

    updateUsersList();
    openUserProfile(profileUsername);
}

function applyProfile(user) {
    currentProfile = {
        avatar: user.avatar || null,
        displayName: user.displayName || user.username || username,
        bio: user.bio || "",
        status: user.status || "Available"
    };
    avatar = currentProfile.avatar;
    localStorage.setItem("avatar", avatar || "");
    localStorage.setItem("displayName", currentProfile.displayName);
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
loadCurrentUserProfile();
loadUserPreferences();

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

function openEditProfile() {
    if (!profileModal) {
        return;
    }

    profileModal.hidden = false;
    profileModal.innerHTML = `
        <div class="profile-modal-card profile-edit-card">
            <button type="button" class="profile-modal-close" onclick="closeUserProfile()" aria-label="Close profile editor">×</button>
            <h3>Edit Profile</h3>
            <form id="editProfileForm" class="profile-modal-form">
                <label>
                    Display name
                    <input id="editProfileDisplayName" maxlength="60" placeholder="Your name" value="${escapeHtml(currentProfile.displayName || username)}">
                </label>

                <label>
                    Profile photo
                    <input id="editProfileAvatarFile" type="file" accept="image/*">
                </label>

                <input id="editProfileAvatar" type="hidden" value="${escapeHtml(currentProfile.avatar || "")}">

                <div id="editProfileAvatarPreview">
                    ${renderProfilePreviewMarkup(currentProfile.avatar, "Current profile photo")}
                </div>

                <label>
                    Status
                    <input id="editProfileStatus" maxlength="80" placeholder="Available" value="${escapeHtml(currentProfile.status || "Available")}">
                </label>

                <label>
                    Bio
                    <textarea id="editProfileBio" maxlength="180" placeholder="Write a short bio">${escapeHtml(currentProfile.bio || "")}</textarea>
                </label>

                <button type="submit" class="profile-modal-save">Save Profile</button>
            </form>
        </div>
    `;

    const editForm = document.getElementById("editProfileForm");
    const editAvatarFile = document.getElementById("editProfileAvatarFile");
    const editAvatar = document.getElementById("editProfileAvatar");
    const editPreview = document.getElementById("editProfileAvatarPreview");
    const editDisplayName = document.getElementById("editProfileDisplayName");
    const editStatus = document.getElementById("editProfileStatus");
    const editBio = document.getElementById("editProfileBio");

    editAvatarFile?.addEventListener("change", async function () {
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
            setUploadProgress(0, "Uploading profile photo");
            const upload = await uploadFileWithProgress(file);
            editAvatar.value = upload.path;
            editPreview.innerHTML = renderProfilePreviewMarkup(upload.path);
            showToast("Profile photo ready. Click Save Profile.");
        } catch (error) {
            console.error("Profile photo upload failed:", error);
            showToast(error.message || "Profile photo upload failed.");
        } finally {
            hideUploadProgress();
            this.value = "";
        }
    });

    editForm?.addEventListener("submit", async (event) => {
        event.preventDefault();

        const response = await fetch(`${SERVER_URL}/auth/profile`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                displayName: editDisplayName.value,
                avatar: editAvatar.value,
                status: editStatus.value,
                bio: editBio.value
            })
        });
        const data = await response.json();

        if (!response.ok) {
            showToast(data.error || "Unable to update profile.");
            return;
        }

        applyProfile(data.user);
        closeUserProfile();
        showToast("Profile updated");
    });
}

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
        const canManageUser = user.username !== username;
        const muted = isUserMuted(user.username);
        const blocked = isUserBlocked(user.username);
        profileModal.innerHTML = `
            <div class="profile-modal-card">
                <button type="button" class="profile-modal-close" onclick="closeUserProfile()" aria-label="Close profile">×</button>
                ${renderAvatar(user.avatar, user.username, "profile-modal-avatar")}
                <h3>${escapeHtml(user.displayName || user.username)}</h3>
                ${user.displayName && user.displayName !== user.username ? `<small>@${escapeHtml(user.username)}</small>` : ""}
                <span>${escapeHtml(user.status || "Available")}</span>
                <p>${escapeHtml(user.bio || "No bio yet.")}</p>
                ${user.lastSeen ? `<small>Last seen ${escapeHtml(new Date(user.lastSeen).toLocaleString())}</small>` : ""}
                ${canManageUser ? `
                    <div class="profile-modal-actions">
                        <button type="button" class="profile-action-btn" onclick="toggleUserMute('${escapeHtml(user.username)}')">
                            ${muted ? "🔔 Unmute Notifications" : "🔕 Mute Notifications"}
                        </button>
                        <button type="button" class="profile-action-btn danger" onclick="toggleUserBlock('${escapeHtml(user.username)}')">
                            ${blocked ? "✅ Unblock User" : "⛔ Block User"}
                        </button>
                    </div>
                ` : ""}
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

function updateChatHeaderProfile(profileUsername) {
    const headerButton = document.getElementById("chatHeaderProfileBtn");

    if (!headerButton) {
        return;
    }

    if (!profileUsername) {
        headerButton.hidden = true;
        headerButton.innerHTML = "";
        return;
    }

    headerButton.hidden = false;
    headerButton.innerHTML = renderAvatar(userAvatars.get(profileUsername), profileUsername, "chat-header-avatar");
    headerButton.setAttribute("aria-label", `View ${profileUsername} profile`);
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
    updateChatHeaderProfile(null);
    document.getElementById("typingStatus").textContent = "Room conversation";
    document.getElementById("searchMessages").value = "";
    roomUnreadCounts[selectedRoom] = 0;
    updateRoomBadges();
    pinnedBar.hidden = true;
    socket.emit("join-room", { room: selectedRoom, username });
    socket.emit("load-room-history", selectedRoom);
    closeMobileSidebar();
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
    updateChatHeaderProfile(user);
    document.getElementById("typingStatus").textContent = "Online";
    document.getElementById("searchMessages").value = "";
    pinnedBar.hidden = true;
    socket.emit("load-history", { username, withUser: user });
    closeMobileSidebar();
}

function updateUsersList() {
    document.querySelectorAll("[id^='user-']").forEach((item) => {
        const user = item.id.replace("user-", "");
        const count = unreadCounts[user] || 0;
        const badgeArea = item.querySelector(".badge-area");
        const details = item.querySelector(".user-list-details small");

        if (badgeArea) {
            badgeArea.innerHTML = count > 0 ? `<span class="unread-badge">${count}</span>` : "";
        }

        item.classList.toggle("muted-user", isUserMuted(user));
        item.classList.toggle("blocked-user", isUserBlocked(user));

        const baseStatus = details?.dataset.baseStatus || details?.textContent || "";

        if (details && isUserBlocked(user)) {
            details.textContent = "Blocked";
        } else if (details && isUserMuted(user)) {
            details.textContent = `${baseStatus} · Muted`;
        } else if (details) {
            details.textContent = baseStatus;
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

function toggleMobileSidebar() {
    document.querySelector(".sidebar")?.classList.toggle("mobile-open");
    document.getElementById("sidebarOverlay")?.toggleAttribute("hidden");
}

function closeMobileSidebar() {
    document.querySelector(".sidebar")?.classList.remove("mobile-open");
    document.getElementById("sidebarOverlay")?.setAttribute("hidden", "");
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
