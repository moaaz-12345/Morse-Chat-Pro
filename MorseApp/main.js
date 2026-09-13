const path = require("path");
const { app, BrowserWindow, dialog } = require("electron");
const { autoUpdater } = require("electron-updater");

const isDevelopment = !app.isPackaged;

function createWindow() {
    const win = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1024,
        minHeight: 720,
        backgroundColor: "#07101d",
        icon: path.join(__dirname, "assets", "icon.ico"),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    win.loadFile("./Html/chat.html");
}

function setupAutoUpdates() {
    if (isDevelopment) return;

    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.on("error", (error) => {
        console.warn("Auto update failed:", error.message);
    });

    autoUpdater.on("update-downloaded", () => {
        dialog.showMessageBox({
            type: "info",
            title: "Morse Chat Pro update ready",
            message: "A new Morse Chat Pro update has been downloaded.",
            detail: "Restart the app to install it now, or close the app later to update automatically.",
            buttons: ["Restart now", "Later"],
            defaultId: 0,
            cancelId: 1
        }).then(({ response }) => {
            if (response === 0) {
                autoUpdater.quitAndInstall(false, true);
            }
        }).catch(() => {});
    });

    autoUpdater.checkForUpdatesAndNotify().catch((error) => {
        console.warn("Could not check for updates:", error.message);
    });
}

app.whenReady().then(() => {
    createWindow();
    setupAutoUpdates();
});

app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});
