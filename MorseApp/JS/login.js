const SERVER_URL = window.MORSE_CHAT_CONFIG?.serverUrl || "http://localhost:3000";

let authMode = "login";

function setAuthMode(mode) {
    authMode = mode;
    document.getElementById("authTitle").textContent =
        mode === "register" ? "Create Account" : "Morse Chat Pro";
    document.getElementById("avatarGroup").hidden = mode !== "register";
    document.getElementById("contactFields").hidden = mode !== "register";
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
    localStorage.setItem("displayName", authResponse.user.displayName || authResponse.user.username);
    localStorage.setItem("avatar", authResponse.user.avatar || "");
    localStorage.setItem("email", authResponse.user.email || "");
    localStorage.setItem("phone", authResponse.user.phone || "");
}

function normalizePhone(phone) {
    return phone.replace(/[^\d+]/g, "").trim();
}

function validateEmail(email) {
    if (!email) {
        return "";
    }

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        ? ""
        : "Enter a valid email address.";
}

function validatePhone(phone) {
    if (!phone) {
        return "";
    }

    return /^\+?\d{8,15}$/.test(phone)
        ? ""
        : "Enter a valid phone number.";
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
    const email = document.getElementById("email").value.trim().toLowerCase();
    const phone = normalizePhone(document.getElementById("phone").value);
    const password = document.getElementById("password").value;
    const file = document.getElementById("avatar").files[0];
    const feedback = document.getElementById("authFeedback");

    feedback.textContent = "";

    if (!username || !password) {
        feedback.textContent = authMode === "register"
            ? "Enter username and password."
            : "Enter username, email, or phone and password.";
        return;
    }

    const usernameError = authMode === "register" ? validateUsername(username) : "";
    const emailError = validateEmail(email);
    const phoneError = validatePhone(phone);

    if (usernameError) {
        feedback.textContent = usernameError;
        return;
    }

    if (authMode === "register" && !email && !phone) {
        feedback.textContent = "Enter email or phone number.";
        return;
    }

    if (emailError || phoneError) {
        feedback.textContent = emailError || phoneError;
        return;
    }

    try {
        const avatar = authMode === "register" ? await readAvatarFile(file) : null;
        const payload = authMode === "register"
            ? { username, email, phone, password, avatar }
            : { identifier: username, password };
        const response = await fetch(`${SERVER_URL}/auth/${authMode}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
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

function loginWithGoogle() {
    window.location.href = `${SERVER_URL}/auth/google`;
}

function consumeGoogleAuthRedirect() {
    const params = new URLSearchParams(window.location.search);
    const googleAuth = params.get("googleAuth");
    const authError = params.get("authError");
    const feedback = document.getElementById("authFeedback");

    if (authError) {
        feedback.textContent = authError;
    }

    if (!googleAuth) {
        return;
    }

    try {
        const result = JSON.parse(googleAuth);
        saveSession(result);
        window.history.replaceState({}, document.title, window.location.pathname);
        window.location = "chat.html";
    } catch (error) {
        console.error("Google auth payload failed:", error);
        feedback.textContent = "Google login failed.";
    }
}

consumeGoogleAuthRedirect();
