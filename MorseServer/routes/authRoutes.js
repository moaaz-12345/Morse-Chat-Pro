const express = require("express");
const bcrypt = require("bcryptjs");

const User = require("../models/User");
const { authenticateRequest } = require("../middleware/authMiddleware");
const { requireMongo } = require("../middleware/requireMongo");
const { signAuthToken } = require("../utils/authToken");
const {
    normalizePassword,
    normalizeUsername,
    sanitizeAvatar,
    sanitizeProfileText,
    validateUsername
} = require("../utils/userValidation");
const { authRateLimiter } = require("../middleware/securityMiddleware");

const router = express.Router();

function publicUser(user) {
    return {
        username: user.username,
        avatar: user.avatar || null,
        bio: user.bio || "",
        status: user.status || "Available",
        lastSeen: user.lastSeen || null
    };
}

router.post("/auth/register", authRateLimiter, requireMongo, async (req, res) => {
    try {
        const username = normalizeUsername(req.body.username);
        const password = normalizePassword(req.body.password);
        const avatar = sanitizeAvatar(req.body.avatar);
        const usernameError = validateUsername(username);

        if (usernameError) {
            return res.status(400).json({ error: usernameError });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: "Password must be at least 6 characters." });
        }

        if (password.length > 128) {
            return res.status(400).json({ error: "Password must be 128 characters or fewer." });
        }

        const existingUser = await User.findOne({ username });

        if (existingUser) {
            return res.status(409).json({ error: "Username is already taken." });
        }

        const passwordHash = await bcrypt.hash(password, 12);
        const user = await User.create({
            username,
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
        const username = normalizeUsername(req.body.username);
        const password = normalizePassword(req.body.password);
        const user = await User.findOne({ username });

        if (!username || password.length > 128) {
            return res.status(401).json({ error: "Invalid username or password." });
        }

        if (!user) {
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

router.get("/auth/me", requireMongo, authenticateRequest, (req, res) => {
    return res.json({
        user: publicUser(req.user)
    });
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
