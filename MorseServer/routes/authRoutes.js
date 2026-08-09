const express = require("express");
const bcrypt = require("bcryptjs");

const User = require("../models/User");
const { authenticateRequest } = require("../middleware/authMiddleware");
const { requireMongo } = require("../middleware/requireMongo");
const { signAuthToken } = require("../utils/authToken");
const {
    CLIENT_ORIGIN,
    CLIENT_REDIRECT_ORIGIN,
    GOOGLE_CALLBACK_URL,
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    JWT_EXPIRES_IN
} = require("../config/serverConfig");
const {
    normalizePassword,
    normalizeUsername,
    sanitizeAvatar,
    sanitizeProfileText,
    validateUsername
} = require("../utils/userValidation");
const { authRateLimiter } = require("../middleware/securityMiddleware");

const router = express.Router();
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

function publicUser(user) {
    return {
        username: user.username,
        displayName: user.displayName || user.username,
        email: user.email || "",
        phone: user.phone || "",
        avatar: user.avatar || null,
        bio: user.bio || "",
        status: user.status || "Available",
        lastSeen: user.lastSeen || null
    };
}

function publicPreferences(user) {
    return {
        mutedUsers: Array.isArray(user.mutedUsers) ? user.mutedUsers : [],
        blockedUsers: Array.isArray(user.blockedUsers) ? user.blockedUsers : [],
        blockWindows: Array.isArray(user.blockWindows) ? user.blockWindows : []
    };
}

function normalizeEmail(email = "") {
    return String(email).trim().toLowerCase();
}

function normalizePhone(phone = "") {
    return String(phone).replace(/[^\d+]/g, "").trim();
}

function validateEmail(email) {
    if (!email) {
        return "";
    }

    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return "Enter a valid email address.";
    }

    return "";
}

function validatePhone(phone) {
    if (!phone) {
        return "";
    }

    if (!/^\+?\d{8,15}$/.test(phone)) {
        return "Enter a valid phone number.";
    }

    return "";
}

function buildLoginQuery(identifier) {
    const normalizedIdentifier = String(identifier || "").trim();
    const normalizedEmail = normalizeEmail(normalizedIdentifier);
    const normalizedPhone = normalizePhone(normalizedIdentifier);
    const normalizedUsername = normalizeUsername(normalizedIdentifier);
    const clauses = [];

    if (normalizedUsername) {
        clauses.push({ username: normalizedUsername });
    }

    if (normalizedEmail) {
        clauses.push({ email: normalizedEmail });
    }

    if (normalizedPhone) {
        clauses.push({ phone: normalizedPhone });
    }

    return clauses.length ? { $or: clauses } : { username: "" };
}

function makeGoogleUsername(email, displayName) {
    const base = normalizeUsername(
        (displayName || email.split("@")[0] || "google_user")
            .replace(/\s+/g, "_")
            .replace(/[^a-zA-Z0-9_]/g, "_")
    ).slice(0, 24) || "google_user";

    return `${base}_${Math.random().toString(36).slice(2, 8)}`.slice(0, 32);
}

router.post("/auth/register", authRateLimiter, requireMongo, async (req, res) => {
    try {
        const username = normalizeUsername(req.body.username);
        const password = normalizePassword(req.body.password);
        const email = normalizeEmail(req.body.email);
        const phone = normalizePhone(req.body.phone);
        const avatar = sanitizeAvatar(req.body.avatar);
        const usernameError = validateUsername(username);
        const emailError = validateEmail(email);
        const phoneError = validatePhone(phone);

        if (usernameError) {
            return res.status(400).json({ error: usernameError });
        }

        if (emailError) {
            return res.status(400).json({ error: emailError });
        }

        if (phoneError) {
            return res.status(400).json({ error: phoneError });
        }

        if (!email && !phone) {
            return res.status(400).json({ error: "Enter email or phone number." });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: "Password must be at least 6 characters." });
        }

        if (password.length > 128) {
            return res.status(400).json({ error: "Password must be 128 characters or fewer." });
        }

        const duplicateClauses = [{ username }];

        if (email) {
            duplicateClauses.push({ email });
        }

        if (phone) {
            duplicateClauses.push({ phone });
        }

        const existingUser = await User.findOne({ $or: duplicateClauses });

        if (existingUser) {
            return res.status(409).json({ error: "Username, email, or phone is already registered." });
        }

        const passwordHash = await bcrypt.hash(password, 12);
        const user = await User.create({
            username,
            email: email || undefined,
            phone: phone || undefined,
            passwordHash,
            avatar
        });

        const token = signAuthToken(user);

        return res.status(201).json({
            token,
            user: publicUser(user)
        });
    } catch (error) {
        console.error("Register failed:", error);
        return res.status(500).json({ error: "Unable to register user." });
    }
});

router.post("/auth/login", authRateLimiter, requireMongo, async (req, res) => {
    try {
        const identifier = req.body.identifier || req.body.username;
        const password = normalizePassword(req.body.password);
        const user = await User.findOne(buildLoginQuery(identifier));

        if (!identifier || password.length > 128) {
            return res.status(401).json({ error: "Invalid username or password." });
        }

        if (!user || !user.passwordHash) {
            return res.status(401).json({ error: "Invalid username or password." });
        }

        const passwordMatches = await bcrypt.compare(password, user.passwordHash);

        if (!passwordMatches) {
            return res.status(401).json({ error: "Invalid username or password." });
        }

        const token = signAuthToken(user);

        return res.json({
            token,
            user: publicUser(user)
        });
    } catch (error) {
        console.error("Login failed:", error);
        return res.status(500).json({ error: "Unable to login." });
    }
});

router.get("/auth/google", authRateLimiter, requireMongo, (req, res) => {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
        return res.status(503).send("Google login is not configured.");
    }

    const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: GOOGLE_CALLBACK_URL,
        response_type: "code",
        scope: "openid email profile",
        prompt: "select_account"
    });

    return res.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
});

router.get("/auth/google/callback", authRateLimiter, requireMongo, async (req, res) => {
    try {
        const code = req.query.code;

        if (!code) {
            return res.redirect(`${CLIENT_REDIRECT_ORIGIN}/Html/login.html?authError=Google%20login%20cancelled`);
        }

        const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: new URLSearchParams({
                code,
                client_id: GOOGLE_CLIENT_ID,
                client_secret: GOOGLE_CLIENT_SECRET,
                redirect_uri: GOOGLE_CALLBACK_URL,
                grant_type: "authorization_code"
            })
        });
        const tokenData = await tokenResponse.json();

        if (!tokenResponse.ok) {
            throw new Error(tokenData.error_description || "Unable to verify Google account.");
        }

        const profileResponse = await fetch(GOOGLE_USERINFO_URL, {
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`
            }
        });
        const googleProfile = await profileResponse.json();

        if (!profileResponse.ok || !googleProfile.sub || !googleProfile.email) {
            throw new Error("Unable to load Google profile.");
        }

        let user = await User.findOne({
            $or: [
                { googleId: googleProfile.sub },
                { email: normalizeEmail(googleProfile.email) }
            ]
        });

        if (!user) {
            user = await User.create({
                username: makeGoogleUsername(googleProfile.email, googleProfile.name),
                displayName: sanitizeProfileText(googleProfile.name, 60) || normalizeEmail(googleProfile.email).split("@")[0],
                email: normalizeEmail(googleProfile.email),
                googleId: googleProfile.sub,
                avatar: googleProfile.picture || null,
                status: "Available"
            });
        } else if (!user.googleId) {
            user.googleId = googleProfile.sub;
            user.avatar = user.avatar || googleProfile.picture || null;
            await user.save();
        }

        const token = signAuthToken(user);
        const payload = encodeURIComponent(JSON.stringify({
            token,
            user: publicUser(user),
            expiresIn: JWT_EXPIRES_IN
        }));

        return res.redirect(`${CLIENT_REDIRECT_ORIGIN}/Html/login.html?googleAuth=${payload}`);
    } catch (error) {
        console.error("Google login failed:", error);
        return res.redirect(`${CLIENT_REDIRECT_ORIGIN}/Html/login.html?authError=${encodeURIComponent(error.message || "Google login failed")}`);
    }
});

router.get("/auth/me", requireMongo, authenticateRequest, (req, res) => {
    return res.json({
        user: publicUser(req.user)
    });
});

router.get("/auth/preferences", requireMongo, authenticateRequest, (req, res) => {
    return res.json(publicPreferences(req.user));
});

router.patch("/auth/preferences/:targetUsername", requireMongo, authenticateRequest, async (req, res) => {
    try {
        const targetUsername = normalizeUsername(req.params.targetUsername);
        const usernameError = validateUsername(targetUsername);

        if (usernameError || targetUsername === req.user.username) {
            return res.status(400).json({ error: "Invalid user preference target." });
        }

        const muted = Boolean(req.body.muted);
        const blocked = Boolean(req.body.blocked);
        const targetUser = await User.findOne({ username: targetUsername }).lean();

        if (!targetUser) {
            return res.status(404).json({ error: "User not found." });
        }

        const currentUser = await User.findOne({ username: req.user.username });

        if (!currentUser) {
            return res.status(401).json({ error: "User no longer exists." });
        }

        const mutedSet = new Set(currentUser.mutedUsers || []);
        const blockedSet = new Set(currentUser.blockedUsers || []);
        const wasBlocked = blockedSet.has(targetUsername);

        if (muted) {
            mutedSet.add(targetUsername);
        } else {
            mutedSet.delete(targetUsername);
        }

        if (blocked) {
            blockedSet.add(targetUsername);

            if (!wasBlocked) {
                currentUser.blockWindows.push({
                    username: targetUsername,
                    blockedAt: new Date(),
                    unblockedAt: null
                });
            }
        } else {
            blockedSet.delete(targetUsername);

            if (wasBlocked) {
                const openWindow = [...currentUser.blockWindows]
                    .reverse()
                    .find((window) => window.username === targetUsername && !window.unblockedAt);

                if (openWindow) {
                    openWindow.unblockedAt = new Date();
                }
            }
        }

        currentUser.mutedUsers = [...mutedSet];
        currentUser.blockedUsers = [...blockedSet];
        await currentUser.save();

        return res.json(publicPreferences(currentUser.toObject()));
    } catch (error) {
        console.error("Preferences update failed:", error);
        return res.status(500).json({ error: "Unable to update preferences." });
    }
});

router.get("/users/:username/profile", requireMongo, authenticateRequest, async (req, res) => {
    try {
        const profileUsername = normalizeUsername(req.params.username);
        const usernameError = validateUsername(profileUsername);

        if (usernameError) {
            return res.status(400).json({ error: "Invalid username." });
        }

        const user = await User.findOne({ username: profileUsername }).lean();

        if (!user) {
            return res.status(404).json({ error: "User not found." });
        }

        return res.json({
            user: publicUser(user)
        });
    } catch (error) {
        console.error("Load profile failed:", error);
        return res.status(500).json({ error: "Unable to load profile." });
    }
});

router.patch("/auth/profile", requireMongo, authenticateRequest, async (req, res) => {
    try {
        const updates = {
            displayName: sanitizeProfileText(req.body.displayName, 60) || req.user.username,
            avatar: sanitizeAvatar(req.body.avatar),
            bio: sanitizeProfileText(req.body.bio, 180),
            status: sanitizeProfileText(req.body.status || "Available", 80) || "Available"
        };

        const user = await User.findOneAndUpdate(
            { username: req.user.username },
            { $set: updates },
            { new: true, runValidators: true }
        );

        return res.json({
            user: publicUser(user)
        });
    } catch (error) {
        console.error("Profile update failed:", error);
        return res.status(500).json({ error: "Unable to update profile." });
    }
});

module.exports = {
    authRouter: router
};
