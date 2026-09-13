const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const wwwDir = path.join(rootDir, "www");
const androidRawDir = path.join(rootDir, "android", "app", "src", "main", "res", "raw");

const dirsToCopy = ["Html", "CSS", "JS", "assets", "Audio"];

function removeDir(dir) {
    if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
    }
}

function copyDir(source, destination) {
    if (!fs.existsSync(source)) {
        throw new Error(`Missing required directory: ${source}`);
    }

    fs.cpSync(source, destination, {
        recursive: true,
        filter: (filePath) => !filePath.includes(`${path.sep}node_modules${path.sep}`)
    });
}

removeDir(wwwDir);
fs.mkdirSync(wwwDir, { recursive: true });

for (const dirName of dirsToCopy) {
    copyDir(path.join(rootDir, dirName), path.join(wwwDir, dirName));
}

fs.writeFileSync(
    path.join(wwwDir, "index.html"),
    `<!doctype html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Morse Chat Pro</title>
    <meta http-equiv="refresh" content="0; url=Html/login.html">
    <script>window.location.replace("Html/login.html");</script>
</head>
<body>
    <a href="Html/login.html">Open Morse Chat Pro</a>
</body>
</html>
`,
    "utf8"
);

fs.mkdirSync(androidRawDir, { recursive: true });

const notificationSound = path.join(rootDir, "assets", "notification.mp3");
if (fs.existsSync(notificationSound)) {
    fs.copyFileSync(notificationSound, path.join(androidRawDir, "notification.mp3"));
}

console.log(`Prepared Android web bundle at ${wwwDir}`);
