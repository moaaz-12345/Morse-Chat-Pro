const express = require("express");
const multer = require("multer");
const path = require("path");

const allowedFileTypes = new Map([
    ["image/jpeg", [".jpg", ".jpeg"]],
    ["image/png", [".png"]],
    ["image/gif", [".gif"]],
    ["image/webp", [".webp"]],
    ["audio/webm", [".webm"]],
    ["audio/mpeg", [".mp3", ".mpeg"]],
    ["audio/wav", [".wav"]],
    ["video/mp4", [".mp4"]],
    ["video/webm", [".webm"]],
    ["application/pdf", [".pdf"]],
    ["application/zip", [".zip"]],
    ["application/x-zip-compressed", [".zip"]],
    ["application/msword", [".doc"]],
    ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", [".docx"]],
    ["application/vnd.ms-excel", [".xls"]],
    ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", [".xlsx"]]
]);

function sanitizeOriginalName(filename = "attachment") {
    const parsed = path.parse(filename);
    const safeName = parsed.name
        .replace(/[^a-zA-Z0-9._ -]/g, "_")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 120) || "attachment";
    const safeExtension = parsed.ext.toLowerCase();

    return `${safeName}${safeExtension}`;
}

function isAllowedUpload(file) {
    const extension = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = allowedFileTypes.get(file.mimetype);

    return Boolean(allowedExtensions?.includes(extension));
}

function createUploadRouter(uploadDir, authenticateUpload) {
    const router = express.Router();

    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
            const extension = path.extname(sanitizeOriginalName(file.originalname)).toLowerCase();
            cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`);
        }
    });

    const upload = multer({
        storage,
        limits: {
            fileSize: 50 * 1024 * 1024
        },
        fileFilter: (req, file, cb) => {
            if (isAllowedUpload(file)) {
                cb(null, true);
                return;
            }

            cb(new Error("Unsupported file type or extension"));
        }
    });

    const uploadMiddleware = authenticateUpload
        ? [authenticateUpload, upload.single("file")]
        : [upload.single("file")];

    router.post("/upload", ...uploadMiddleware, (req, res) => {
        if (!req.file) {
            res.status(400).json({ message: "No file uploaded" });
            return;
        }

        res.json({
            path: "/uploads/" + req.file.filename,
            originalName: sanitizeOriginalName(req.file.originalname),
            mimeType: req.file.mimetype,
            size: req.file.size
        });
    });

    router.use((error, req, res, next) => {
        if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
            res.status(413).json({ message: "File is too large. Maximum size is 50MB." });
            return;
        }

        if (error) {
            res.status(400).json({ message: error.message || "Upload failed" });
            return;
        }

        next();
    });

    return router;
}

module.exports = {
    createUploadRouter
};
