const SERVER_URL = window.MORSE_CHAT_CONFIG?.serverUrl || "http://localhost:3000";

const username = localStorage.getItem("username");
const token = localStorage.getItem("token");
let avatar = localStorage.getItem("avatar");
let currentProfile = {
    avatar,
    displayName: localStorage.getItem("displayName") || username,
    bio: localStorage.getItem("bio") || "",
    status: localStorage.getItem("status") || "Available"
};

if (!username || !token) {
    window.location = "login.html";
}

let selectedUser = null;
let selectedRoom = null;
let replyMessage = null;
let unreadCounts = {};
let roomUnreadCounts = {};
let soundEnabled = true;
let typingTimer;
let mediaRecorder;
let audioChunks = [];
let mutedUsers = JSON.parse(localStorage.getItem("mutedUsers") || "[]");
let blockedUsers = JSON.parse(localStorage.getItem("blockedUsers") || "[]");
let blockWindows = JSON.parse(localStorage.getItem("blockWindows") || "[]");

const messageStore = new Map();
const userAvatars = new Map();

const messagesElement = document.getElementById("messages");
const messageInput = document.getElementById("message");
const notifySound = document.getElementById("notifySound");
const notificationArea = document.getElementById("notificationArea");
const pinnedBar = document.getElementById("pinnedBar");

if (localStorage.getItem("theme") === "light") {
    document.body.classList.add("light-mode");
}

function renderCurrentUserInfo() {
    document.getElementById("userInfo").innerHTML = `
        <img
            class="profile-brand-logo"
            src="../assets/logo-white.png"
            alt="Morse Chat Pro logo"
        >
        <button
            class="profile-avatar-button"
            type="button"
            onclick="openEditProfile()"
            aria-label="Edit your profile"
            title="Edit profile"
        >
            ${renderAvatar(avatar, username, "profile-avatar")}
        </button>
        <h4>${escapeHtml(currentProfile.displayName || username || "Guest")}</h4>
        <small>${escapeHtml(currentProfile.status || "Available")}</small>
    `;
}

renderCurrentUserInfo();

const socket = io(SERVER_URL, {
    auth: {
        token
    }
});

socket.on("connect_error", (error) => {
    console.error("Socket authentication failed:", error.message);
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("avatar");
    window.location = "login.html";
});

socket.on("connect", () => {
    socket.emit("join", { username, avatar });
    window.dispatchEvent(new Event("morse-app-ready"));
});
