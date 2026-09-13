(function () {
    const capacitor = window.Capacitor;

    if (!capacitor?.isNativePlatform?.()) {
        return;
    }

    document.documentElement.classList.add("is-capacitor");
    document.body?.classList.add("is-capacitor");

    async function configureNativeShell() {
        const statusBar = capacitor.Plugins?.StatusBar;
        const keyboard = capacitor.Plugins?.Keyboard;
        const localNotifications = capacitor.Plugins?.LocalNotifications;

        try {
            await statusBar?.setBackgroundColor?.({ color: "#07101d" });
            await statusBar?.setStyle?.({ style: "DARK" });
        } catch {}

        try {
            await keyboard?.setResizeMode?.({ mode: "body" });
        } catch {}

        try {
            const permission = await localNotifications?.checkPermissions?.();

            if (permission?.display !== "granted") {
                await localNotifications?.requestPermissions?.();
            }
        } catch {}
    }

    configureNativeShell();
})();
