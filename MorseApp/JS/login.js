const SERVER_URL = "http://localhost:3000";

let authMode = "login";

function setAuthMode(mode) {
    authMode = mode;
    document.getElementById("authTitle").textContent =
        mode === "register" ? "Create Account" : "Morse Chat Pro";
    document.getElementById("avatarGroup").hidden = mode !== "register";
    document.getElementById("submitBtn").textContent =
        mode === "register" ? "Register" : "Login";

    document.getElementById("loginModeBtn").classList.toggle("active", mode === "login");
    document.getElementById("registerModeBtn").classList.toggle("active", mode === "register");
}

function readAvatarFile(file) {
    return new Promise((resolve, reject) => {
        if (!file) {
            resolve(null);
            return;
        }

        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function saveSession(authResponse) {
    localStorage.setItem("token", authResponse.token);
    localStorage.setItem("username", authResponse.user.username);
    localStorage.setItem("avatar", authResponse.user.avatar || "");
}

function validateUsername(username) {
    const reserved = ["null", "undefined", "guest", "admin", "system"];

    if (username.length < 3 || username.length > 32) {
        return "Username must be 3 to 32 characters.";
    }

    if (reserved.includes(username.toLowerCase())) {
        return "This username is reserved.";
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return "Username can only contain letters, numbers, and underscores.";
    }

    return "";
}

async function login() {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;
    const file = document.getElementById("avatar").files[0];
    const feedback = document.getElementById("authFeedback");

    feedback.textContent = "";

    if (!username || !password) {
        feedback.textContent = "Enter username and password.";
        return;
    }

    const usernameError = validateUsername(username);

    if (usernameError) {
        feedback.textContent = usernameError;
        return;
    }

    try {
        const avatar = authMode === "register" ? await readAvatarFile(file) : null;
        const response = await fetch(`${SERVER_URL}/auth/${authMode}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                username,
                password,
                avatar
            })
        });

        const result = await response.json();

        if (!response.ok) {
            feedback.textContent = result.error || "Authentication failed.";
            return;
        }

        saveSession(result);
        window.location = "chat.html";
    } catch (error) {
        console.error("Auth failed:", error);
        feedback.textContent = "Unable to connect to the server.";
    }
}
